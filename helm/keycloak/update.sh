#!/bin/bash

namespace="colonyos-keycloak"
helm upgrade keycloak -f values.yaml -n ${namespace} --wait .
