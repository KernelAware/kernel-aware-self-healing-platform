from detection.strategies.generic_detector import GenericDetector


class MemoryDetector(GenericDetector):
    def __init__(self):
        super().__init__("memory")