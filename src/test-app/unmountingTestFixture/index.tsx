import React from "react";

import { calledOnUnmount } from "./unmountCb";

export function UnmountingTest() {
  React.useEffect(() => {
    return () => {
      calledOnUnmount();
    };
  }, []);

  return null;
}
