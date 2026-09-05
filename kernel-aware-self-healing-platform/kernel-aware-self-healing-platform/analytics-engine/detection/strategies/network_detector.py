from detection.strategies.base_detector import DetectionStrategy


class NetworkDetector(DetectionStrategy):

    def detect(self, rule):
        print("Detecting disk rule")

        return []