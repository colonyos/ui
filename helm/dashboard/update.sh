#!/bin/bash

namespace="dashboard"
helm upgrade dashboard -f values.yaml -n ${namespace} --debug --wait .
