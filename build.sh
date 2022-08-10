#!/usr/bin/env bash

function installUtils() {
    if command -v brew; then
        brew install $@
    elif command -v apt; then
        apt install $@
    elif command -v yum; then
        yum install $@
    fi
}

if ! command -v node; then
    if command -v winget; then
        if winget install OpenJS.NodeJS.LTS; then
            echo "Install OpenJS.NodeJS.LTS Successfully, Please run the shell script again."
            exit 0
        fi
    else
        installUtils node
        if ! command -v npm; then
            # windows 下 npm 和 nodejs 在一个包里面
            installUtils npm
        fi
    fi

    if ! command -v node; then
        if bash -c "command -v npm"; then
            echo "Can not find nodejs. Please try again."
        fi
    fi
fi

if ! command -v vsce; then
    npm install -g vsce
fi

cd "$(dirname "$0")"

npm install

git clean -ffdx dist *.vsix
vsce package
