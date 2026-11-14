/* ************************************************************************
 *
 *    Qooxdoo DataGrid
 *
 *    https://github.com/qooxdoo/qooxdoo
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 * *********************************************************************** */

qx.Class.define("qxl.datagrid.test.util.Debounce", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testTriggerDuringRunIsNotLost() {
      let runs = 0;
      let debounce = new qxl.datagrid.util.Debounce(() => {
        runs++;
        if (runs == 1) {
          // like a changeSize listener which changes the array again
          debounce.run();
        }
      }, 0);
      debounce.run();
      debounce.run();
      await new Promise(resolve => setTimeout(resolve, 50));
      this.assertEquals(2, runs, "one run for both triggers before the timeout, one for the trigger during the run");
    },

    async testRunsAgainAfterError() {
      let runs = 0;
      let debounce = new qxl.datagrid.util.Debounce(() => {
        runs++;
        if (runs == 1) {
          throw new Error("failed");
        }
      }, 0);
      await debounce.run().catch(() => null);
      await debounce.run();
      this.assertEquals(2, runs);
    },

    async testDisposeDropsPendingRun() {
      let runs = 0;
      let debounce = new qxl.datagrid.util.Debounce(() => runs++, 0);
      let promise = debounce.run();
      debounce.dispose();
      await promise;
      await new Promise(resolve => setTimeout(resolve, 20));
      this.assertEquals(0, runs, "the pending run is dropped and its promise resolves");
    }
  }
});
