#!/bin/bash

DEPLOY_PK="$1"

mkdir tmp
ABSOLUTE_TMP=$(echo "$(cd "$(dirname "$tmp")"; pwd -P)/$(basename "tmp")")
echo "$DEPLOY_PK" > ./tmp/deploy-key
chmod 0600 ./tmp/deploy-key
npm i

echo ">>> Cloning existing website..."
git config --global user.email "deployment@qooxdoo.org"
git config --global user.name "Automated Deployment for qooxdoo/qxl-datagrid.qooxdoo.github.io"
git clone -c core.sshCommand="/usr/bin/ssh -i $ABSOLUTE_TMP/deploy-key" git@github.com:qooxdoo/qxl-datagrid.qooxdoo.github.io.git --depth=1 ./tmp/qxl-datagrid.qooxdoo.github.io

echo
echo ">>> Building website..."
qx deploy --out=./tmp/qxl-datagrid.qooxdoo.github.io

cd ./tmp/qxl-datagrid.qooxdoo.github.io
if [[ ! -d .git ]] ; then
    echo "The checked out qxl-datagrid.qooxdoo.github.io is not a .git repo!"
    exit 1
fi

git add .
git commit -m 'automatic deployment from qooxdoo/qxl-datagrid.qooxdoo.github.io/.github/workflows/build-website.sh'
git push

