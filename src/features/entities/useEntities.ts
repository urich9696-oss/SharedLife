import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  createEntity,
  getEntity,
  listDeletedEntities,
  listEntities,
  listEntitiesByType,
  restoreEntity,
  searchEntities,
  softDeleteEntity,
  updateEntity,
} from '@/lib/indexed-db/repositories/entities'
import { listBudgets } from '@/lib/indexed-db/repositories/budgets'
import { listReminders } from '@/lib/indexed-db/repositories/reminders'
import { getEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import type { CreateEntityPayload, UpdateEntityPayload } from '@/lib/validation/entity'
import type { DetailType, EntityRow, EntityType } from '@/lib/indexed-db/schema'

export const entityKeys = {
  all: (spaceId: string) => ['entities', spaceId] as const,
  byType: (spaceId: string, type: EntityType) => ['entities', spaceId, type] as const,
  search: (spaceId: string, query: string, types?: EntityType[]) =>
    ['entities', spaceId, 'search', query, types] as const,
  detail: (id: string) => ['entity', id] as const,
  entityDetail: (id: string, detailType: DetailType) =>
    ['entity-detail', id, detailType] as const,
  deleted: (spaceId: string) => ['deleted-entities', spaceId] as const,
  budgets: (spaceId: string) => ['budgets', spaceId] as const,
  reminders: (spaceId: string) => ['reminders', spaceId] as const,
}

function invalidateEntityQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  spaceId: string | null,
  entityId?: string,
) {
  if (!spaceId) return
  void queryClient.invalidateQueries({ queryKey: ['entities', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['deleted-entities', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['budgets', spaceId] })
  void queryClient.invalidateQueries({ queryKey: ['reminders', spaceId] })
  if (entityId) {
    void queryClient.invalidateQueries({ queryKey: ['entity', entityId] })
  }
}

export function useEntities() {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: spaceId ? entityKeys.all(spaceId) : ['entities', 'none'],
    queryFn: () => listEntities(spaceId!),
    enabled: !!spaceId,
  })
}

export function useEntitiesByType(type: EntityType) {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: spaceId ? entityKeys.byType(spaceId, type) : ['entities', 'none', type],
    queryFn: () => listEntitiesByType(spaceId!, type),
    enabled: !!spaceId,
  })
}

export function useEntitySearch(query: string, types?: EntityType[]) {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: spaceId ? entityKeys.search(spaceId, query, types) : ['entities', 'search'],
    queryFn: () => searchEntities(spaceId!, query, types),
    enabled: !!spaceId,
  })
}

export function useEntity(id: string | undefined) {
  return useQuery({
    queryKey: id ? entityKeys.detail(id) : ['entity', 'none'],
    queryFn: () => getEntity(id!),
    enabled: !!id,
  })
}

export function useEntityDetailPayload(id: string | undefined, detailType: DetailType) {
  return useQuery({
    queryKey: id ? entityKeys.entityDetail(id, detailType) : ['entity-detail', 'none'],
    queryFn: async () => {
      const row = await getEntityDetail(id!, detailType)
      return row?.payload ?? null
    },
    enabled: !!id,
  })
}

export function useDeletedEntities() {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: spaceId ? entityKeys.deleted(spaceId) : ['deleted-entities', 'none'],
    queryFn: () => listDeletedEntities(spaceId!),
    enabled: !!spaceId,
  })
}

export function useBudgets() {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: spaceId ? entityKeys.budgets(spaceId) : ['budgets', 'none'],
    queryFn: () => listBudgets(spaceId!),
    enabled: !!spaceId,
  })
}

export function useReminders() {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: spaceId ? entityKeys.reminders(spaceId) : ['reminders', 'none'],
    queryFn: () => listReminders(spaceId!),
    enabled: !!spaceId,
  })
}

export function useCreateEntity() {
  const queryClient = useQueryClient()
  const { spaceId, session } = useAuth()

  return useMutation({
    mutationFn: (payload: CreateEntityPayload) =>
      createEntity(payload, session?.userId ?? null),
    onSuccess: (row) => invalidateEntityQueries(queryClient, spaceId, row.id),
  })
}

export function useUpdateEntity() {
  const queryClient = useQueryClient()
  const { spaceId, session } = useAuth()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateEntityPayload }) =>
      updateEntity(id, spaceId!, patch, session?.userId ?? null),
    onSuccess: (row) => invalidateEntityQueries(queryClient, spaceId, row.id),
  })
}

export function useSoftDeleteEntity() {
  const queryClient = useQueryClient()
  const { spaceId, session } = useAuth()

  return useMutation({
    mutationFn: (id: string) => softDeleteEntity(id, spaceId!, session?.userId ?? null),
    onSuccess: (_, id) => invalidateEntityQueries(queryClient, spaceId, id),
  })
}

export function useRestoreEntity() {
  const queryClient = useQueryClient()
  const { spaceId, session } = useAuth()

  return useMutation({
    mutationFn: (id: string) => restoreEntity(id, spaceId!, session?.userId ?? null),
    onSuccess: (_, id) => invalidateEntityQueries(queryClient, spaceId, id),
  })
}

export function filterActiveEntities(entities: EntityRow[]): EntityRow[] {
  return entities.filter((e) => e.status === 'active' || e.status === 'draft')
}
