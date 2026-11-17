from app.services.responder import build_reply, tokenize


def test_tokenize_roundtrip():
    text = "Hello  world\n\n| a | b |\n```py\nprint(1)\n```\n"
    assert "".join(tokenize(text)) == text


def test_table_keyword():
    assert "| Layer |" in build_reply("show me a TABLE").text


def test_image_keyword():
    assert "![" in build_reply("any picture?").text


def test_menu_actions():
    reply = build_reply("let me choose")
    assert reply.actions and any(g["type"] == "menu" for g in reply.actions)


def test_topic_followup():
    assert "FastAPI" in build_reply("Tell me about FastAPI").text


def test_default_echo_quotes_prompt():
    reply = build_reply("zzz unknown")
    assert "> zzz unknown" in reply.text
