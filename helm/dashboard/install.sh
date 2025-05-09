#!/bin/bash

namespace="dashboard"
helm install dashboard -f values.yaml -n ${namespace} .
