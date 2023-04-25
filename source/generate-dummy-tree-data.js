const fs = require("fs");
const path = require("path");

async function getPermissions(filename) {
  const test = async (bitMask, permLetter) => {
    try {
      await fs.promises.access(filename, bitMask);
      return permLetter;
    } catch (ex) {
      return "-";
    }
  };

  return (await test(fs.constants.R_OK, "r")) + (await test(fs.constants.W_OK, "w")) + (await test(fs.constants.X_OK, "x"));
}

async function getFileInfo(filename) {
  let stat = await fs.promises.stat(filename);
  let result = {
    name: path.basename(filename),
    permissions: (stat.isDirectory() ? "d" : "-") + (await getPermissions(filename)),
    lastModified: stat.mtime
  };

  if (stat.isDirectory()) {
    let files = await fs.promises.readdir(filename);
    result.children = [];
    for (let child of files) {
      let info = await getFileInfo(path.join(filename, child));
      result.children.push(info);
    }
  } else {
    result.size = stat.size;
  }

  return result;
}

(async () => {
  let info = await getFileInfo("../../qooxdoo/source");
  await fs.promises.writeFile("resource/qxl/datagrid/demo/tree/dummy-tree-data.json", JSON.stringify(info, null, 2), "utf8");
  console.log("Generated test data");
})();
