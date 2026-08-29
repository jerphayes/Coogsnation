# NGF Mother AI Training Architecture

NGF Mother AI controls the training lifecycle.

DATA COLLECTION
-> PROVENANCE
-> CURATION
-> DATASET VERSION
-> TRAINING RECIPE
-> GPU EXECUTION
-> CHECKPOINT
-> EVALUATION
-> PROMOTION OR REJECTION
-> DEPLOYMENT
-> OBSERVATION
-> IMPROVEMENT

OLMo-core provides the trainable model foundation.

The Mother AI control plane decides what may be trained, what data may be used, which evaluation gates must pass, and whether a checkpoint may be promoted.

Initial model family: OLMo-3 7B.

Large datasets, model weights and checkpoints are stored outside Git.
