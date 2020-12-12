#!/usr/bin/env bash
secret=$(cat static_auth_secret.key) && \
time=$(date +%s) && \
expiry=8400 && \
username=$(( $time + $expiry )) &&\
echo username:$username && \
echo password:$(echo -n $username | openssl dgst -binary -sha1 -hmac $secret | openssl base64)
