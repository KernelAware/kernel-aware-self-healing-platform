"""Identity for one Analytics Engine process run."""

import time
import uuid


# The timestamp lets the Backend reject a delayed lifecycle-start request from
# an older process. The random suffix keeps identifiers unique on fast restarts.
ANALYTICS_GENERATION = f"{time.time_ns()}-{uuid.uuid4().hex}"
