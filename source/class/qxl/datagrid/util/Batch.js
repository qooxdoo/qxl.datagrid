/**
 * Helper method to suspend method calls and execute them in a batch at the end
 */
qx.Class.define("qxl.datagrid.util.Batch", {
  extend: qx.core.Object,

  /**
   * Constructor
   *
   * @param {Function} fn the function to call when not suspended
   */
  construct(fn) {
    super();
    this.__fn = fn;
  },

  properties: {
    /** Whether the execution is disabled */
    enabled: {
      init: true,
      check: "Boolean",
      event: "changeEnabled"
    }
  },

  members: {
    /** @type{Integer} the number of times `suspend` has been called without a call to `resume` */
    __suspensionCount: 0,

    /** @type{Integer} the number of times `run` has been called while suspended */
    __activationCount: 0,

    /**
     * Suspends execution
     */
    suspend() {
      this.__suspensionCount++;
    },

    /**
     * Resumes execution - must be called an equal number of times as `suspend` before execution will resume
     */
    resume() {
      this.__suspensionCount--;
      if (qx.core.Environment.get("qx.debug")) {
        this.assertTrue(this.__suspensionCount >= 0);
      }
      if (this.__suspensionCount == 0 && this.__activationCount > 0) {
        this.__activationCount = 0;
        this.__fn();
      }
    },

    /**
     * Runs the function if not suspended
     */
    run() {
      if (this.isEnabled()) {
        if (this.__suspensionCount) {
          this.__activationCount++;
        } else {
          this.__fn();
        }
      }
    }
  }
});
