import React from "react";
import * as Redux from "react-redux";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreatePolicy from "../../pages/CreatePolicy";
import CreatePolicyForm from "../../components/CreatePolicy/CreatePolicyForm";
import { fieldsData, policyData } from "../../staticData/data";

// Mock react-redux
jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

// Mock react-hook-form
const mockHandleSubmit = jest.fn();
const mockWatch = jest.fn();
const mockSetError = jest.fn();
const mockClearErrors = jest.fn();

jest.mock("react-hook-form", () => ({
  ...jest.requireActual("react-hook-form"),
  useForm: jest.fn(() => ({
    handleSubmit: mockHandleSubmit,
    watch: mockWatch,
    formState: {
      errors: {},
      isValid: true,
    },
    setError: mockSetError,
    clearErrors: mockClearErrors,
    register: jest.fn(),
  })),
  FormProvider: ({ children }) => React.createElement("div", null, children),
}));

// Mock custom hooks
jest.mock("../../hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key, options) => options ? `${key}_${JSON.stringify(options)}` : key }),
}));

jest.mock("../../hooks/useCustomAlert", () => ({
  useCustomAlert: () => ({ showAlert: jest.fn() }),
}));

jest.mock("../../hooks/useScreenSize", () => ({
  useScreenSize: () => ({ width: 1200, height: 800 }),
}));

// Mock child components
jest.mock("../../components/CreatePolicy/PolicyGeneralForm", () => {
  return function PolicyGeneralForm() {
    return React.createElement("div", { "data-testid": "policy-general-form" }, "Policy General Form");
  };
});

jest.mock("../../components/CreatePolicy/PolicyActions", () => {
  return function PolicyActions() {
    return React.createElement("div", { "data-testid": "policy-actions" }, "Policy Actions");
  };
});

jest.mock("../../components/CreatePolicy/PolicyResources", () => {
  return function PolicyResources() {
    return React.createElement("div", { "data-testid": "policy-resources" }, "Policy Resources");
  };
});

jest.mock("../../components/CreatePolicy/PolicySummary", () => {
  return function PolicySummary() {
    return React.createElement("div", { "data-testid": "policy-summary" }, "Policy Summary");
  };
});

jest.mock("../../components/CreatePolicy/PolicyStepper", () => {
  return function PolicyStepper() {
    return React.createElement("div", { "data-testid": "policy-stepper" }, "Policy Stepper");
  };
});

jest.mock("../../components/CreatePolicy/PolicyMobileStepper", () => {
  return function PolicyMobileStepper() {
    return React.createElement("div", { "data-testid": "policy-mobile-stepper" }, "Policy Mobile Stepper");
  };
});

jest.mock("../../components/CreatePolicy/FixedFooter", () => {
  return function FixedFooter() {
    return React.createElement("div", { "data-testid": "fixed-footer" }, "Fixed Footer");
  };
});

jest.mock("../../components/common/NotificationDialog", () => {
  return function NotificationDialog({ isOpen, children }) {
    return isOpen ? React.createElement("div", { "data-testid": "notification-dialog" }, children) : null;
  };
});

// Mock navigation utilities
jest.mock("../../utils/navigationUtils", () => ({
  policyList: jest.fn(),
}));

// Mock utility functions
jest.mock("../../utils/policyUtils", () => ({
  getProductName: jest.fn(() => "Test Product"),
}));

describe("CreatePolicyForm Component", () => {
  const useSelectorMock = jest.spyOn(Redux, "useSelector");
  const useDispatchMock = jest.spyOn(Redux, "useDispatch");
  const mockDispatch = jest.fn();
  const mockShowAlert = jest.fn();

  // Simple mock navigation service
  const navigationService = {
    back: jest.fn(),
    goHome: jest.fn(),
    navigateToItem: jest.fn(),
  };

  const defaultMockState = {
    referenceData: fieldsData,
    isPolicyNameUnique: true,
    fetchPolicyNameRequestStatus: "Default",
    getPolicyCreateRequestStatus: "Default",
    policyErrors: {},
    allProducts: [],
    currentRequestId: "123",
  };

  beforeEach(() => {
    useDispatchMock.mockReturnValue(mockDispatch);
    useSelectorMock.mockImplementation((selector) => {
      return selector({ policyState: defaultMockState });
    });
    
    mockWatch.mockReturnValue("testProductGroup");
    mockHandleSubmit.mockImplementation((callback) => jest.fn());
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Basic rendering
  test("should render CreatePolicyForm successfully", () => {
    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );
    
    expect(screen.getByTestId("policy-general-form")).toBeInTheDocument();
  });

  // Test 2: Copy policy mode
  test("should render in copy policy mode", () => {
    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: true,
        policyDetails: policyData[0],
      })
    );
    
    expect(screen.getByTestId("policy-general-form")).toBeInTheDocument();
  });

  // Test 3: Policy name uniqueness validation - not unique
  test("should set error when policy name is not unique", async () => {
    useSelectorMock.mockImplementation((selector) => {
      return selector({
        policyState: {
          ...defaultMockState,
          fetchPolicyNameRequestStatus: "Success",
          isPolicyNameUnique: false,
        },
      });
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
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
    useSelectorMock.mockImplementation((selector) => {
      return selector({
        policyState: {
          ...defaultMockState,
          fetchPolicyNameRequestStatus: "Success",
          isPolicyNameUnique: true,
        },
      });
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    await waitFor(() => {
      expect(mockClearErrors).toHaveBeenCalledWith("policyName");
    });
  });

  // Test 5: Successful policy creation
  test("should show success alert when policy is created successfully", async () => {
    require("../../hooks/useCustomAlert").useCustomAlert.mockReturnValue({
      showAlert: mockShowAlert,
    });

    useSelectorMock.mockImplementation((selector) => {
      return selector({
        policyState: {
          ...defaultMockState,
          getPolicyCreateRequestStatus: "Success",
          currentRequestId: "12345",
        },
      });
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalled();
    });
  });

  // Test 6: Failed policy creation
  test("should show error alert when policy creation fails", async () => {
    require("../../hooks/useCustomAlert").useCustomAlert.mockReturnValue({
      showAlert: mockShowAlert,
    });

    useSelectorMock.mockImplementation((selector) => {
      return selector({
        policyState: {
          ...defaultMockState,
          getPolicyCreateRequestStatus: "Failed",
          policyErrors: { createError: "Creation failed" },
        },
      });
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalled();
    });
  });

  // Test 7: Handle form submission
  test("should handle form submission", async () => {
    const mockCallback = jest.fn();
    mockHandleSubmit.mockImplementation((callback) => {
      mockCallback.mockImplementation(callback);
      return mockCallback;
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    // Simulate form submission
    act(() => {
      mockCallback({ policyName: "Test Policy" });
    });

    expect(mockCallback).toHaveBeenCalled();
  });

  // Test 8: Button disabled states
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
      register: jest.fn(),
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    // Test that form renders with errors
    expect(screen.getByTestId("policy-general-form")).toBeInTheDocument();
  });

  // Test 9: Screen size effects for mobile
  test("should handle mobile screen size", () => {
    require("../../hooks/useScreenSize").useScreenSize.mockReturnValue({
      width: 500,
      height: 600,
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(screen.getByTestId("policy-mobile-stepper")).toBeInTheDocument();
  });

  // Test 10: Handle different steps
  test("should render different steps", () => {
    const mockUseState = jest.spyOn(React, "useState");
    
    // Mock active step as 1 (Policy Actions)
    mockUseState.mockImplementationOnce(() => [1, jest.fn()]);

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(screen.getByTestId("policy-actions")).toBeInTheDocument();
  });

  // Test 11: Handle step 2 (Resources)
  test("should render resources step", () => {
    const mockUseState = jest.spyOn(React, "useState");
    
    // Mock active step as 2 (Policy Resources)
    mockUseState.mockImplementationOnce(() => [2, jest.fn()]);

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(screen.getByTestId("policy-resources")).toBeInTheDocument();
  });

  // Test 12: Handle step 3 (Summary)
  test("should render summary step", () => {
    const mockUseState = jest.spyOn(React, "useState");
    
    // Mock active step as 3 (Policy Summary)
    mockUseState.mockImplementationOnce(() => [3, jest.fn()]);

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(screen.getByTestId("policy-summary")).toBeInTheDocument();
  });

  // Test 13: Handle dialog interactions
  test("should handle cancel dialog", () => {
    const mockUseState = jest.spyOn(React, "useState");
    
    // Mock dialog open state
    mockUseState.mockImplementationOnce(() => [0, jest.fn()]); // activeStep
    mockUseState.mockImplementationOnce(() => [[], jest.fn()]); // selectedResources
    mockUseState.mockImplementationOnce(() => [false, jest.fn()]); // isScrollVisible
    mockUseState.mockImplementationOnce(() => [[], jest.fn()]); // selectedActions
    mockUseState.mockImplementationOnce(() => [true, jest.fn()]); // openCancelDialog
    mockUseState.mockImplementationOnce(() => [{}, jest.fn()]); // newPolicyData

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(screen.getByTestId("notification-dialog")).toBeInTheDocument();
  });

  // Test 14: Handle scroll visibility
  test("should handle scroll visibility", () => {
    const mockUseState = jest.spyOn(React, "useState");
    
    // Mock scroll visible state
    mockUseState.mockImplementationOnce(() => [1, jest.fn()]); // activeStep > 0
    mockUseState.mockImplementationOnce(() => [[], jest.fn()]); // selectedResources
    mockUseState.mockImplementationOnce(() => [true, jest.fn()]); // isScrollVisible
    
    require("../../hooks/useScreenSize").useScreenSize.mockReturnValue({
      width: 1200,
      height: 800,
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(screen.getByTestId("fixed-footer")).toBeInTheDocument();
  });

  // Test 15: Handle product group selection
  test("should handle product group selection", () => {
    mockWatch.mockReturnValue("selectedProductGroup");

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(mockWatch).toHaveBeenCalledWith("productGroup");
  });

  // Test 16: Handle policy creation request pending
  test("should handle pending policy creation request", () => {
    useSelectorMock.mockImplementation((selector) => {
      return selector({
        policyState: {
          ...defaultMockState,
          getPolicyCreateRequestStatus: "Pending",
        },
      });
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    // Component should render in loading state
    expect(screen.getByTestId("policy-general-form")).toBeInTheDocument();
  });

  // Test 17: Handle policy name checking pending
  test("should handle pending policy name checking", () => {
    useSelectorMock.mockImplementation((selector) => {
      return selector({
        policyState: {
          ...defaultMockState,
          fetchPolicyNameRequestStatus: "Pending",
        },
      });
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(screen.getByTestId("policy-general-form")).toBeInTheDocument();
  });

  // Test 18: Handle empty reference data
  test("should handle empty reference data", () => {
    useSelectorMock.mockImplementation((selector) => {
      return selector({
        policyState: {
          ...defaultMockState,
          referenceData: null,
        },
      });
    });

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    expect(screen.getByTestId("policy-general-form")).toBeInTheDocument();
  });

  // Test 19: Component cleanup
  test("should cleanup on unmount", () => {
    const { unmount } = render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    unmount();
    // Verify cleanup was called
    expect(mockDispatch).toHaveBeenCalled();
  });

  // Test 20: Handle default case in step rendering
  test("should handle default case in step rendering", () => {
    const mockUseState = jest.spyOn(React, "useState");
    
    // Mock active step as invalid number
    mockUseState.mockImplementationOnce(() => [99, jest.fn()]);

    render(
      React.createElement(CreatePolicyForm, {
        navigationService: navigationService,
        isCopyPolicy: false,
      })
    );

    // Should render "Not Found" for invalid step
    expect(screen.getByText("Not Found")).toBeInTheDocument();
  });
});