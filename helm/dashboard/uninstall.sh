#!/bin/bash

namespace="dashboard"

helm uninstall dashboard -n ${namespace}
