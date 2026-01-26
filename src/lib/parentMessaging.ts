// Communication utility for MyEDLs when embedded in MyHome
const PARENT_ORIGIN = "*"; // TODO: Specify MyHome origin in production for security

export type ParentMessageType = 
  | "MYEDLS_RETURN_TO_HUB"
  | "edl:created"
  | "edl:updated"
  | "edl:completed"
  | "edl:error"
  | "edl:navigation"
  | "edl:ready"
  | "pong";

// Initialize ping/pong listener for MyHome health checks
export const initParentMessaging = () => {
  if (window.parent !== window) {
    window.addEventListener("message", (event) => {
      if (event.data?.type === "ping") {
        window.parent.postMessage({ type: "pong" }, PARENT_ORIGIN);
      }
    });
  }
};

export interface ParentMessageData {
  id?: string;
  property?: string;
  message?: string;
  route?: string;
  [key: string]: unknown;
}

export const notifyParent = (type: ParentMessageType, data?: ParentMessageData) => {
  if (window.parent !== window) {
    window.parent.postMessage({ type, data }, PARENT_ORIGIN);
  }
};

// Notify parent that MyEDLs is ready
export const notifyReady = () => {
  notifyParent("edl:ready");
};

// Notify parent of EDL creation
export const notifyEdlCreated = (id: string, property?: string) => {
  notifyParent("edl:created", { id, property });
};

// Notify parent of EDL update
export const notifyEdlUpdated = (id: string, property?: string) => {
  notifyParent("edl:updated", { id, property });
};

// Notify parent of EDL completion
export const notifyEdlCompleted = (id: string, property?: string) => {
  notifyParent("edl:completed", { id, property });
};

// Notify parent of error
export const notifyEdlError = (message: string) => {
  notifyParent("edl:error", { message });
};

// Notify parent of navigation change
export const notifyNavigation = (route: string) => {
  notifyParent("edl:navigation", { route });
};

// Return to hub (MyHome)
export const returnToHub = () => {
  notifyParent("MYEDLS_RETURN_TO_HUB");
};
