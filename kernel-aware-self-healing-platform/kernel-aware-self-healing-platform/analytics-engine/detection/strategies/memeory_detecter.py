from detection.base_detector import DetectionStrategy


class MemoryDetector(DetectionStrategy):

    def detect(self, rule, metrics):
        print("Detecting memory rule")

        return []