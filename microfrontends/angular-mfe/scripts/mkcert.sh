#!/bin/bash
#set -x

echo "Installing mkcert"
brew install mkcert
mkcert -install

echo "Creating certificates for dvag-demo-local.com"
mkcert -cert-file dvag-demo-cert.pem -key-file dvag-demo-key.pem dvag-demo-local.com

if grep -q "dvag-demo-local.com" /private/etc/hosts; then
    echo "\"dvag-demo-local.com\" is already present in /private/etc/hosts"
else
    echo "Adding \"dvag-demo-local.com\" to /private/etc/hosts (requires running in sudo mode)"
    sudo sh -c "echo '127.0.0.1 dvag-demo-local.com' >> /private/etc/hosts"
fi

echo ""
cat /private/etc/hosts
