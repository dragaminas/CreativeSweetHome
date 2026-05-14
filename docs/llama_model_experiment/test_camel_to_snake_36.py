from openclaw_studio.utils import camel_to_snake, snake_to_camel


def test_simple_camel_case():
    assert camel_to_snake('camelCase') == 'camel_case'


def test_already_snake_case():
    assert camel_to_snake('snake_case') == 'snake_case'


def test_consecutive_uppercase():
    assert camel_to_snake('XMLParser') == 'xml_parser'


def test_single_word():
    assert camel_to_snake('word') == 'word'


def test_empty_string():
    assert camel_to_snake('') == ''


def test_multiple_words():
    assert camel_to_snake('thisIsALongCamelCase') == 'this_is_a_long_camel_case'


def test_starts_with_uppercase():
    assert camel_to_snake('HTML') == 'html'


def test_camel_case_with_number():
    assert camel_to_snake('version2Value') == 'version2_value'


# --- snake_to_camel tests ---


def test_snake_to_camel_basic():
    assert snake_to_camel('snake_case') == 'snakeCase'


def test_snake_to_camel_already_camel():
    assert snake_to_camel('camelCase') == 'camelCase'


def test_snake_to_camel_empty_string():
    assert snake_to_camel('') == ''


def test_snake_to_camel_multiple_underscores():
    assert snake_to_camel('foo__bar') == 'fooBar'
