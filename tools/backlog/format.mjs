/**
 * GitHub issue body formatter — shared by Sprint 0 and Sprint 1 backlogs.
 */
export function formatStoryDescription(story, { zohoUrl } = {}) {
  const gh = `https://github.com/infinitica-org/smart/issues/${story.github}`;
  const zoho =
    zohoUrl ||
    '_Zoho item linked in manifest — agents do not update Zoho; edit backlog.mjs + sync GitHub._';

  return `## Ticket ID
${story.id}

## User value
${story.userValue}

## Owner
${story.owner} (${story.handle}) · ${story.area}

## GitHub
${gh}

## Zoho
${zoho}

## Sprint goal link
${story.sprintGoalLink}

## Contract impact
${story.contractImpact}

## Dependencies
- **Blocked by:** ${story.blockedBy.length ? story.blockedBy.join(', ') : 'none'}
- **Blocks:** ${story.blocks.length ? story.blocks.join(', ') : 'none'}

## Acceptance criteria
${story.acceptanceCriteria.map((c) => `- [ ] ${c}`).join('\n')}

## Definition of Done
${story.dod.map((c) => `- [ ] ${c}`).join('\n')}

## Implementation subtasks
${story.subtasks.map((c) => `- [ ] ${c}`).join('\n')}

## Failure modes
${story.failureModes.map((c) => `- ${c}`).join('\n')}

## Demo script
${story.demoScript}`;
}
