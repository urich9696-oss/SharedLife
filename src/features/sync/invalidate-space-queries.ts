import type { QueryClient } from '@tanstack/react-query'

/** Invalidiert UI-Queries, die Partner-Änderungen anzeigen sollen. */
export function invalidateSpaceQueries(
  queryClient: QueryClient,
  spaceId: string,
  entityId?: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ['entities', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['deleted-entities', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['home-recent-moments', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['home-progress', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['home-entity-covers', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['home-memories', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['home-timeline', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['memories', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['timeline-derived', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['deck-cards', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['checklists'] })
  void queryClient.invalidateQueries({ queryKey: ['shopping', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['shopping-preview', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['checklist-items'] })
  void queryClient.invalidateQueries({ queryKey: ['checklistItems'] })
  void queryClient.invalidateQueries({ queryKey: ['budgets', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['monthly-budget', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['transactions', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['notes'] })
  void queryClient.invalidateQueries({ queryKey: ['reminders', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['timelineEntries', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['mediaAssets'] })
  void queryClient.invalidateQueries({ queryKey: ['entityMedia'] })
  void queryClient.invalidateQueries({ queryKey: ['pair-profile', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['activity-log', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['recipe-covers', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['recipe-ingredients'] })
  void queryClient.invalidateQueries({ queryKey: ['date-ideas-covers', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['recipes', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['entity-detail'] })
  void queryClient.invalidateQueries({ queryKey: ['entityDetail'] })

  if (entityId) {
    void queryClient.invalidateQueries({ queryKey: ['entity', entityId] })
    void queryClient.invalidateQueries({ queryKey: ['entity-cover', entityId] })
    void queryClient.invalidateQueries({ queryKey: ['entity-gallery', entityId] })
    void queryClient.invalidateQueries({ queryKey: ['entityDetail', entityId] })
    void queryClient.invalidateQueries({ queryKey: ['entity-detail', entityId] })
    void queryClient.invalidateQueries({ queryKey: ['recipe-ingredients', entityId] })
    void queryClient.invalidateQueries({ queryKey: ['notes', entityId] })
    void queryClient.invalidateQueries({ queryKey: ['entityMedia', entityId] })
    void queryClient.invalidateQueries({ queryKey: ['related-tasks'] })
    void queryClient.invalidateQueries({ queryKey: ['related-dates'] })
    void queryClient.invalidateQueries({ queryKey: ['related-moments'] })
  }
}
