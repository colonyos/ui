#!/bin/bash

namespace="colonyos-keycloak"
helm uninstall keycloak -n ${namespace}
