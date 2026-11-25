#!/usr/bin/env python3
"""Генерация PKCS12-хранилища ключей для подписи APK (стабильная подпись)."""
import os
import datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization.pkcs12 import serialize_key_and_certificates
from cryptography.hazmat.primitives.asymmetric import rsa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'android', 'debug.keystore')

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
name = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, u'Android Debug'),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, u'Android'),
    x509.NameAttribute(NameOID.COUNTRY_NAME, u'US'),
])
now = datetime.datetime.utcnow()
cert = (x509.CertificateBuilder()
        .subject_name(name).issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=10950))
        .sign(key, hashes.SHA256()))

data = serialize_key_and_certificates(
    b'androiddebugkey', key, cert, None,
    serialization.BestAvailableEncryption(b'android'))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'wb') as f:
    f.write(data)
print('keystore written:', OUT, len(data), 'bytes')
