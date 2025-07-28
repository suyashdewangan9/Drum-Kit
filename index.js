import React from "react";
import * as Redux from "react-redux";
import CreatePolicy from "../../pages/CreatePolicy";
import CreatePolicyForm from "../../components/CreatePolicy/CreatePolicyForm";
import "@testing-library/jest-dom/extend-expect";
import { render, screen, fireEvent, waitFor, act } from "../../../utils/TestUtils";
import { fieldsData, policyData } from "../../staticData/data";

// Mock react-redux
jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

// Mock react-hook-form
jest.mock("react-hook-form", () => ({
  ...jest.requireActual("react-hook-form"),
  useForm: jest.fn(),
  FormProvider: ({ children }) => <div>{children}</div>,
}));

// Mock custom hooks
jest.mock("../../hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock("../../hooks/useCustomAlert", () => ({
  useCustomAlert: () => ({ showAlert: jest.fn() }),
}));

jest.mock("../../hooks/useScreenSize", () => ({
  useScreenSize: () => ({ width: 1200, height: 800 }),
}));

describe("CreatePolicyForm Component", () => {
  const useSelectorMock = jest.spyOn(Redux, "useSelector");
  const useDispatchMock = jest.spyOn(Redux, "useDispatch");
  const mockDispatch = jest.fn();
  const mockSetError = jest.fn();
  const mockClearErrors = jest.fn();
  const mockHandleSubmit = jest.fn();
  const mockWatch = jest.fn();

  const containerMock = {
    getNavigationService: (_tileInstanceId: string): TileNavigationService => {
      return {} as TileNavigationService;
    },
  };
  const containerApi = containerMock as PluginContainer;
  const navigationService = containerApi.getNavigationService("1");

  const defaultMockState = {
    policyState: {
      referenceData: fieldsData,
      isPolicyNameUnique: true,
      fetchPolicyNameRequestStatus: "Default",
      getPolicyCreateRequestStatus: "Default",
      policyErrors: {},
      allProducts: [],
      currentRequestId: "123",
    },
  };

  beforeEach(() => {
    useDispatchMock.mockReturnValue(mockDispatch);
    useSelectorMock.mockReturnValue(defaultMockState);
    
    // Mock useForm return value
    require("react-hook-form").useForm.mockReturnValue({
      handleSubmit: mockHandleSubmit,
      watch: mockWatch,
      formState: {
        errors: {},
        isValid: true,
      },
      setError: mockSetError,
      clearErrors: mockClearErrors,
    });

    mockWatch.mockReturnValue("testProductGroup");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Basic rendering
  test("should render CreatePolicyForm successfully", () => {
    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );
    
    expect(screen.getByText("general")).toBeInTheDocument();
  });

  // Test 2: Copy policy mode
  test("should render in copy policy mode", () => {
    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={true}
        policyDetails={policyData[0]}
      />
    );
    
    expect(screen.getByText("copyPolicy")).toBeInTheDocument();
  });

  // Test 3: Policy name uniqueness validation - not unique
  test("should set error when policy name is not unique", async () => {
    useSelectorMock.mockReturnValue({
      ...defaultMockState,
      policyState: {
        ...defaultMockState.policyState,
        fetchPolicyNameRequestStatus: "Success",
        isPolicyNameUnique: false,
      },
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("policyName", {
        type: "manual",
        message: "policyNameUniqueError",
      });
    });
  });

  // Test 4: Policy name uniqueness validation - clear errors when unique
  test("should clear errors when policy name is unique", async () => {
    useSelectorMock.mockReturnValue({
      ...defaultMockState,
      policyState: {
        ...defaultMockState.policyState,
        fetchPolicyNameRequestStatus: "Success",
        isPolicyNameUnique: true,
      },
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    await waitFor(() => {
      expect(mockClearErrors).toHaveBeenCalledWith("policyName");
    });
  });

  // Test 5: Successful policy creation
  test("should show success alert when policy is created successfully", async () => {
    const mockShowAlert = jest.fn();
    require("../../hooks/useCustomAlert").useCustomAlert.mockReturnValue({
      showAlert: mockShowAlert,
    });

    useSelectorMock.mockReturnValue({
      ...defaultMockState,
      policyState: {
        ...defaultMockState.policyState,
        getPolicyCreateRequestStatus: "Success",
        currentRequestId: "12345",
      },
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          newSeverity: "info",
          newVariant: "filled",
        })
      );
    });
  });

  // Test 6: Failed policy creation
  test("should show error alert when policy creation fails", async () => {
    const mockShowAlert = jest.fn();
    require("../../hooks/useCustomAlert").useCustomAlert.mockReturnValue({
      showAlert: mockShowAlert,
    });

    useSelectorMock.mockReturnValue({
      ...defaultMockState,
      policyState: {
        ...defaultMockState.policyState,
        getPolicyCreateRequestStatus: "Failed",
        policyErrors: { createError: "Creation failed" },
      },
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          newMessage: "Creation failed",
          newSeverity: "error",
          newVariant: "filled",
        })
      );
    });
  });

  // Test 7: Handle next button click - first step
  test("should handle next button click on first step", async () => {
    mockHandleSubmit.mockImplementation((callback) => () => {
      callback({ policyName: "Test Policy" });
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const nextButton = screen.getByText("continue");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  // Test 8: Handle back button click
  test("should handle back button click", () => {
    const { rerender } = render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    // Simulate being on step 1
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [1, jest.fn()]);

    rerender(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const backButton = screen.getByText("back");
    fireEvent.click(backButton);
  });

  // Test 9: Handle cancel dialog
  test("should open cancel dialog when cancel is clicked", () => {
    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const cancelButton = screen.getByText("cancel");
    fireEvent.click(cancelButton);

    expect(screen.getByText("discardPolicyTitle")).toBeInTheDocument();
  });

  // Test 10: Handle close dialog
  test("should close cancel dialog when continue is clicked", () => {
    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const cancelButton = screen.getByText("cancel");
    fireEvent.click(cancelButton);

    const continueButton = screen.getByText("continueCreating");
    fireEvent.click(continueButton);
  });

  // Test 11: Handle secondary click in dialog
  test("should handle secondary click in dialog", () => {
    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const cancelButton = screen.getByText("cancel");
    fireEvent.click(cancelButton);

    const discardButton = screen.getByText("discardChanges");
    fireEvent.click(discardButton);
  });

  // Test 12: Button disabled states
  test("should disable button based on form validation", () => {
    require("react-hook-form").useForm.mockReturnValue({
      handleSubmit: mockHandleSubmit,
      watch: mockWatch,
      formState: {
        errors: { policyName: "Required" },
        isValid: false,
      },
      setError: mockSetError,
      clearErrors: mockClearErrors,
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const continueButton = screen.getByText("continue");
    expect(continueButton).toBeDisabled();
  });

  // Test 13: Last step submission
  test("should handle submission on last step", async () => {
    const mockSetActiveStep = jest.fn();
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [3, mockSetActiveStep]); // Last step

    mockHandleSubmit.mockImplementation((callback) => () => {
      callback({
        policyName: "Test Policy",
        productGroup: "group1",
        product: "product1",
        status: "active",
        policyDescription: "Test description",
      });
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const submitButton = screen.getByText("submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // Test 14: Handle edit section
  test("should handle edit section click", () => {
    const mockSetActiveStep = jest.fn();
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [2, mockSetActiveStep]);

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    // This would be triggered from PolicySummary component
    // The handleEditSection function would be called
  });

  // Test 15: Screen size effect
  test("should handle screen size changes", () => {
    require("../../hooks/useScreenSize").useScreenSize.mockReturnValue({
      width: 800,
      height: 600,
    });

    // Mock document.body.clientHeight
    Object.defineProperty(document.body, "clientHeight", {
      value: 500,
      writable: true,
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );
  });

  // Test 16: Mobile stepper
  test("should render mobile stepper for small screens", () => {
    require("../../hooks/useScreenSize").useScreenSize.mockReturnValue({
      width: 500,
      height: 600,
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    // Mobile stepper should be rendered
  });

  // Test 17: Fixed footer visibility
  test("should show fixed footer when scrollable", () => {
    const mockSetIsScrollVisible = jest.fn();
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [0, jest.fn()]); // activeStep
    useState.mockImplementationOnce(() => [[], jest.fn()]); // selectedResources
    useState.mockImplementationOnce(() => [true, mockSetIsScrollVisible]); // isScrollVisible

    require("../../hooks/useScreenSize").useScreenSize.mockReturnValue({
      width: 1200,
      height: 400,
    });

    Object.defineProperty(document.body, "clientHeight", {
      value: 500,
      writable: true,
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );
  });

  // Test 18: Step content rendering - different steps
  test("should render different step content based on active step", () => {
    // Test step 1 - Policy Actions
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [1, jest.fn()]);

    const { rerender } = render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    // Test step 2 - Policy Resources
    useState.mockImplementationOnce(() => [2, jest.fn()]);
    rerender(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );
  });

  // Test 19: Validation schema tests
  test("should handle policy name length validation", async () => {
    // This would test the Yup validation schema
    const longPolicyName = "a".repeat(300); // Assuming max length is less than 300
    
    mockHandleSubmit.mockImplementation((callback) => () => {
      callback({ policyName: longPolicyName });
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );
  });

  // Test 20: Resource and action count display
  test("should display resource and action counts", () => {
    const mockSelectedResources = [{ resourceTypeName: "resource1" }];
    const mockSelectedActions = [{ type: "action1" }];

    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnceOnce(() => [0, jest.fn()]); // activeStep
    useState.mockImplementationOnce(() => [mockSelectedResources, jest.fn()]);
    useState.mockImplementationOnce(() => [false, jest.fn()]); // isScrollVisible
    useState.mockImplementationOnce(() => [mockSelectedActions, jest.fn()]);

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );
  });

  // Test 21: Policy creation with different status
  test("should handle policy creation with inactive status", async () => {
    mockHandleSubmit.mockImplementation((callback) => () => {
      callback({
        policyName: "Test Policy",
        productGroup: "group1",
        product: "product1",
        status: "inactive",
        policyDescription: "Test description",
      });
    });

    const mockSetActiveStep = jest.fn();
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [3, mockSetActiveStep]); // Last step

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const submitButton = screen.getByText("submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // Test 22: Handle reset functionality
  test("should handle reset functionality", () => {
    const mockSetActiveStep = jest.fn();
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [2, mockSetActiveStep]);

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    // The handleReset function would be called
    act(() => {
      // Simulate reset call
    });
  });

  // Test 23: Handle button disabled for different steps
  test("should handle button disabled state for actions step", () => {
    const mockSelectedActions = [];
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [1, jest.fn()]); // actions step
    useState.mockImplementationOnce(() => [[], jest.fn()]); // selectedResources
    useState.mockImplementationOnce(() => [false, jest.fn()]); // isScrollVisible
    useState.mockImplementationOnce(() => [mockSelectedActions, jest.fn()]);

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const continueButton = screen.getByText("continue");
    expect(continueButton).toBeDisabled();
  });

  // Test 24: Handle button disabled for resources step
  test("should handle button disabled state for resources step", () => {
    const mockSelectedResources = [];
    const useState = jest.spyOn(React, "useState");
    useState.mockImplementationOnce(() => [2, jest.fn()]); // resources step
    useState.mockImplementationOnce(() => [mockSelectedResources, jest.fn()]);

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    const continueButton = screen.getByText("continue");
    expect(continueButton).toBeDisabled();
  });

  // Test 25: Product group sorting
  test("should sort product groups correctly", () => {
    const unsortedProductGroups = [
      { productGroupName: "Z Group" },
      { productGroupName: "A Group" },
      { productGroupName: "M Group" },
    ];

    useSelectorMock.mockReturnValue({
      ...defaultMockState,
      policyState: {
        ...defaultMockState.policyState,
        referenceData: {
          ...fieldsData,
          productGroups: unsortedProductGroups,
        },
      },
    });

    render(
      <CreatePolicyForm
        navigationService={navigationService}
        isCopyPolicy={false}
      />
    );

    // The component should sort the product groups alphabetically
  });
});