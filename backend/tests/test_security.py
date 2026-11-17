import uuid

from app.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_roundtrip():
    h = hash_password("s3cret-pass")
    assert verify_password("s3cret-pass", h)
    assert not verify_password("wrong", h)


def test_token_roundtrip():
    uid = uuid.uuid4()
    assert decode_access_token(create_access_token(uid)) == uid
    assert decode_access_token("garbage") is None
