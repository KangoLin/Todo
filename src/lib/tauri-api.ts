import { invoke } from '@tauri-apps/api/core'
import type { Project, Board, Column, Card, CardDetail, Subtask, Tag, SearchResult, DbStats } from '../types'

// Projects
export const createProject = (name: string, description?: string, color?: string) =>
  invoke<Project>('create_project', { name, description, color })
export const getAllProjects = () => invoke<Project[]>('get_all_projects')
export const getProject = (id: string) => invoke<Project>('get_project', { id })
export const updateProject = (id: string, name?: string, description?: string, color?: string) =>
  invoke<Project>('update_project', { id, name, description, color })
export const deleteProject = (id: string) => invoke<void>('delete_project', { id })

// Boards
export const createBoard = (projectId: string, name: string) =>
  invoke<Board>('create_board', { projectId, name })
export const getBoardsByProject = (projectId: string) =>
  invoke<Board[]>('get_boards_by_project', { projectId })
export const getBoard = (id: string) => invoke<Board>('get_board', { id })
export const updateBoard = (id: string, name?: string) =>
  invoke<Board>('update_board', { id, name })
export const deleteBoard = (id: string) => invoke<void>('delete_board', { id })
export const reorderBoards = (ids: string[]) => invoke<void>('reorder_boards', { ids })

// Columns
export const createColumn = (boardId: string, name: string, sortOrder?: number) =>
  invoke<Column>('create_column', { boardId, name, sortOrder })
export const getColumnsByBoard = (boardId: string) =>
  invoke<Column[]>('get_columns_by_board', { boardId })
export const updateColumn = (id: string, name?: string, wipLimit?: number) =>
  invoke<Column>('update_column', { id, name, wipLimit })
export const deleteColumn = (id: string) => invoke<void>('delete_column', { id })
export const reorderColumns = (ids: string[]) => invoke<void>('reorder_columns', { ids })

// Cards
export const createCard = (columnId: string, title: string) =>
  invoke<Card>('create_card', { columnId, title })
export const getCardsByColumn = (columnId: string) =>
  invoke<Card[]>('get_cards_by_column', { columnId })
export const getCard = (id: string) => invoke<CardDetail>('get_card', { id })
export const updateCard = (id: string, params: { title?: string; description?: string; priority?: number; dueDate?: string; coverColor?: string }) =>
  invoke<Card>('update_card', { id, ...params })
export const moveCard = (cardId: string, targetColumnId: string, targetSortOrder: number) =>
  invoke<void>('move_card', { cardId, targetColumnId, targetSortOrder })
export const moveCardWithinColumn = (cardId: string, targetSortOrder: number) =>
  invoke<void>('move_card_within_column', { cardId, targetSortOrder })
export const archiveCard = (id: string) => invoke<void>('archive_card', { id })
export const deleteCard = (id: string) => invoke<void>('delete_card', { id })

// Subtasks
export const createSubtask = (cardId: string, title: string) =>
  invoke<Subtask>('create_subtask', { cardId, title })
export const toggleSubtask = (id: string) => invoke<Subtask>('toggle_subtask', { id })
export const deleteSubtask = (id: string) => invoke<void>('delete_subtask', { id })

// Tags
export const createTag = (boardId: string, name: string, color?: string) =>
  invoke<Tag>('create_tag', { boardId, name, color })
export const getTagsByBoard = (boardId: string) => invoke<Tag[]>('get_tags_by_board', { boardId })
export const deleteTag = (id: string) => invoke<void>('delete_tag', { id })
export const addTagToCard = (cardId: string, tagId: string) => invoke<void>('add_tag_to_card', { cardId, tagId })
export const removeTagFromCard = (cardId: string, tagId: string) => invoke<void>('remove_tag_from_card', { cardId, tagId })
export const getTagsByCard = (cardId: string) => invoke<Tag[]>('get_tags_by_card', { cardId })

// Search
export const searchCards = (query: string, projectId?: string) =>
  invoke<SearchResult[]>('search_cards', { query, projectId })

// Settings
export const getSetting = (key: string) => invoke<string | null>('get_setting', { key })
export const setSetting = (key: string, value: string) => invoke<void>('set_setting', { key, value })
export const getDbStats = () => invoke<DbStats>('get_db_stats_cmd')

// Data import/export
export const exportData = (path: string) => invoke<string>('export_data', { path })
export const importData = (path: string) => invoke<string>('import_data', { path })
