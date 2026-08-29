from detection.base_detector import DetectionStrategy


class NetworkDetector(DetectionStrategy):

    def detect(self, rule, metrics):
        print("Detecting disk rule")

        return []