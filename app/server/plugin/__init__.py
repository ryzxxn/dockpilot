import importlib
import pkgutil

def load_all():
    for _, module_name, _ in pkgutil.iter_modules(__path__):
        try:
            importlib.import_module(f"{__name__}.{module_name}.main")
        except ModuleNotFoundError:
            pass
