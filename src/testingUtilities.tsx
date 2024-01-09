// ignore file coverage
import React from "react";

/**
 * @public
 *
 * Can be used as the slots prop for an xstate-tree view, will render a div containing a <p>slotName-slot<p> for each slot
 */
export const genericSlotsTestingDummy = new Proxy(
  {},
  {
    get(_target, prop) {
      return () => (
        <div>
          <p>
            <>{prop}-slot</>
          </p>
        </div>
      );
    },
  }
) as any;
