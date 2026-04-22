-- New lifecycle state: work finished, distinct from ARCHIVED (cold storage / hide from default list with includeArchived).
ALTER TYPE "ProjectStatus" ADD VALUE 'COMPLETE';
