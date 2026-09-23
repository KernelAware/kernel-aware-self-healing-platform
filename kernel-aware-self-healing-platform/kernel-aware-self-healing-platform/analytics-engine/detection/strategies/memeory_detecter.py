from detection.strategies.base_detector import DetectionStrategy


class MemoryDetector(DetectionStrategy):

    def detect(self, rule):
        print("Detecting memory rule")

        return []