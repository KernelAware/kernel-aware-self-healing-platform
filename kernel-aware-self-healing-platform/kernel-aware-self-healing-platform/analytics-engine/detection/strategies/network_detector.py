from detection.strategies.generic_detector import GenericDetector


class NetworkDetector(GenericDetector):
    def __init__(self):
        super().__init__("network")