from abc import ABC, abstractmethod


class BaseDecision(ABC):

    @abstractmethod
    def decide(self, incident, rule , policy):
        pass