#!/bin/bash

# Navigate to visualizer-db and initialize development database
cd "$(dirname "$0")/../../../packages/visualizer-db" || exit 1

echo "Starting development database..."
yarn dev:db:start

echo "Pushing database schema..."
yarn db:push:dev
