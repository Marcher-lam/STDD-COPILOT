# Python + pytest Starter

## 检测条件
- 项目根目录存在 `pyproject.toml` 或 `setup.py` 或 `requirements.txt`
- 存在 `.py` 文件

## 测试框架配置

### pyproject.toml
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --tb=short"

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true

[tool.ruff]
line-length = 120
select = ["E", "F", "W", "I"]
```

### requirements-dev.txt
```
pytest>=7.4.0
pytest-cov>=4.1.0
mypy>=1.8.0
ruff>=0.1.0
```

### 示例测试 (tests/test_example.py)
```python
def test_addition():
    assert 1 + 1 == 2
```

### conftest.py (tests/)
```python
import pytest

@pytest.fixture
def sample_data():
    return {"key": "value"}
```

## foundation.md 模板
```markdown
# 项目基础约束

## 技术栈
- 语言: Python 3.11+
- 测试框架: pytest
- 包管理器: pip/poetry
- Linter: ruff
- 类型检查: mypy

## 测试命令
- 单元测试: pytest {file} -v
- 覆盖率: pytest --cov=src --cov-report=html
- 类型检查: mypy .
- Lint: ruff check .
```

## Ralph Loop 适配
- RED: `pytest {file} -v`
- CHECK: `mypy . && ruff check .`
- GREEN: `pytest {file} -v`
