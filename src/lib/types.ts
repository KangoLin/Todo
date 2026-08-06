export interface Tag {
  name: string
  color: string
}

export interface Subtask {
  id: string
  text: string
  done: boolean
}

export interface Item {
  id: string
  text: string
  description: string
  start: string
  end: string
  done: boolean
  priority: string
  tags: Tag[]
  subtasks: Subtask[]
  repeat: string
}

export interface Card {
  id: string
  title: string
  date: string | null
  items: Item[]
}

export interface Project {
  id: string
  name: string
  color: string
  sort_order: number
}

export interface ProjectTag {
  id: string
  project_id: string
  name: string
  color: string
}

export interface ThemePreset {
  id: string
  label: string
  accent: string
  light: Record<string, string>
  dark: Record<string, string>
}
