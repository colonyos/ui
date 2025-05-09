#!/bin/bash

namespace="colonyos-keycloak"
helm install keycloak -f values.yaml -n ${namespace} .
