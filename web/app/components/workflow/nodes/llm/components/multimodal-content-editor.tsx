'use client'
import type { FC } from 'react'
import type { Node, NodeOutPutVar, OpenAICompatibleContentPart } from '../../../types'
import { produce } from 'immer'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import PromptEditor from '@/app/components/base/prompt-editor'
import { SimpleSelect } from '@/app/components/base/select'
import { useWorkflowVariableType } from '@/app/components/workflow/hooks'
import AddButton from '@/app/components/workflow/nodes/_base/components/add-button'
import RemoveButton from '@/app/components/workflow/nodes/_base/components/remove-button'
import { BlockEnum } from '../../../types'

const i18nPrefix = 'nodes.llm.multimodal'

type WorkflowNodeMapItem = {
  title: string
  type: Node['data']['type']
  width?: number
  height?: number
  position?: Node['position']
}

type Props = {
  readOnly: boolean
  instanceId: string
  value?: OpenAICompatibleContentPart[]
  nodesOutputVars: NodeOutPutVar[]
  availableNodes: Node[]
  isSupportFileVar?: boolean
  onChange: (value: OpenAICompatibleContentPart[]) => void
}

const defaultTextPart = (): OpenAICompatibleContentPart => ({
  type: 'text',
  text: '',
})

const createStableRowId = () => `llm-multimodal-row-${Math.random().toString(36).slice(2, 11)}`

const MultimodalContentEditor: FC<Props> = ({
  readOnly,
  instanceId,
  value,
  nodesOutputVars,
  availableNodes,
  isSupportFileVar,
  onChange,
}) => {
  const { t } = useTranslation()
  const getVarType = useWorkflowVariableType()
  const content = useMemo(() => value || [], [value])
  const rowIdsRef = useRef<string[]>([])

  useEffect(() => {
    if (content.length > rowIdsRef.current.length) {
      rowIdsRef.current = [
        ...rowIdsRef.current,
        ...Array.from({ length: content.length - rowIdsRef.current.length }, () => createStableRowId()),
      ]
      return
    }

    if (content.length < rowIdsRef.current.length)
      rowIdsRef.current = rowIdsRef.current.slice(0, content.length)
  }, [content.length])
  const workflowNodesMap = useMemo<Record<string, WorkflowNodeMapItem>>(() => {
    return availableNodes.reduce<Record<string, WorkflowNodeMapItem>>((acc, node) => {
      acc[node.id] = {
        title: node.data.title,
        type: node.data.type,
        width: node.width ?? undefined,
        height: node.height ?? undefined,
        position: node.position,
      }
      if (node.data.type === BlockEnum.Start) {
        acc.sys = {
          title: t('blocks.start', { ns: 'workflow' }),
          type: BlockEnum.Start,
        }
      }
      return acc
    }, {})
  }, [availableNodes, t])

  const handlePartTypeChange = useCallback((index: number, type: OpenAICompatibleContentPart['type']) => {
    const newContent = produce(content, (draft) => {
      if (type === 'text') {
        draft[index] = {
          type: 'text',
          text: '',
        }
      }
      else if (type === 'audio_url') {
        draft[index] = {
          type: 'audio_url',
          audio_url: {
            url: '',
          },
        }
      }
      else {
        draft[index] = {
          type: 'image_url',
          image_url: {
            url: '',
          },
        }
      }
    })
    onChange(newContent)
  }, [content, onChange])

  const handlePartValueChange = useCallback((index: number, nextValue: string) => {
    const newContent = produce(content, (draft) => {
      if (draft[index].type === 'text') {
        draft[index] = {
          type: 'text',
          text: nextValue,
        }
        return
      }

      if (draft[index].type === 'audio_url') {
        draft[index] = {
          type: 'audio_url',
          audio_url: {
            ...(draft[index].audio_url || {}),
            url: nextValue,
          },
        }
        return
      }

      draft[index] = {
        type: 'image_url',
        image_url: {
          ...(draft[index].image_url || {}),
          url: nextValue,
        },
      }
    })
    onChange(newContent)
  }, [content, onChange])

  const handleAddPart = useCallback(() => {
    rowIdsRef.current = [...rowIdsRef.current, createStableRowId()]
    onChange([...content, defaultTextPart()])
  }, [content, onChange])

  const handleRemovePart = useCallback((index: number) => {
    rowIdsRef.current = rowIdsRef.current.filter((_, currentIndex) => currentIndex !== index)
    const newContent = produce(content, (draft) => {
      draft.splice(index, 1)
    })
    onChange(newContent)
  }, [content, onChange])

  return (
    <div className="mt-2 space-y-2">
      {
        content.map((part, index) => (
          <div key={rowIdsRef.current[index] || `${instanceId}-multimodal-fallback-${index}`} className="space-y-1.5 rounded-lg border border-divider-subtle bg-components-panel-bg px-2 py-2">
            <div className="flex items-center gap-2">
              <div className="shrink-0">
                <div className="text-text-secondary system-sm-semibold-uppercase">
                  Multimodal Item #
                  {index + 1}
                </div>
              </div>
              <div className="grow">
                <SimpleSelect
                  items={[
                    { name: t(`${i18nPrefix}.types.text`, { ns: 'workflow' }), value: 'text' },
                    { name: t(`${i18nPrefix}.types.image_url`, { ns: 'workflow' }), value: 'image_url' },
                    { name: t(`${i18nPrefix}.types.audio_url`, { ns: 'workflow' }), value: 'audio_url' },
                  ]}
                  defaultValue={part.type}
                  disabled={readOnly}
                  onSelect={(item) => {
                    handlePartTypeChange(index, item.value as OpenAICompatibleContentPart['type'])
                  }}
                />
              </div>
              {!readOnly && (
                <RemoveButton
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleRemovePart(index)
                  }}
                />
              )}
            </div>

            <div className="relative overflow-hidden rounded-lg border border-transparent bg-components-input-bg-normal px-2 focus-within:border-components-input-border-active hover:border-components-input-border-hover">
              <PromptEditor
                instanceId={`${instanceId}-multimodal-${index}`}
                compact
                className="min-h-[56px]"
                value={part.type === 'text' ? part.text : part.type === 'image_url' ? part.image_url?.url || '' : part.audio_url?.url || ''}
                placeholder={part.type === 'text'
                  ? t(`${i18nPrefix}.textPlaceholder`, { ns: 'workflow' })
                  : part.type === 'image_url'
                    ? t(`${i18nPrefix}.imageUrlPlaceholder`, { ns: 'workflow' })
                    : t(`${i18nPrefix}.audioUrlPlaceholder`, { ns: 'workflow' })}
                workflowVariableBlock={{
                  show: true,
                  variables: nodesOutputVars || [],
                  getVarType,
                  workflowNodesMap,
                }}
                contextBlock={{ show: false, selectable: false, canNotAddContext: true }}
                historyBlock={{ show: false, selectable: false, history: { user: 'Human', assistant: 'Assistant' } }}
                queryBlock={{ show: false, selectable: false }}
                onChange={nextValue => handlePartValueChange(index, nextValue)}
                editable={!readOnly}
                isSupportFileVar={isSupportFileVar}
              />
              {readOnly && <div className="absolute inset-0 z-10" />}
            </div>
          </div>
        ))
      }

      {!readOnly && (
        <AddButton
          text={t(`${i18nPrefix}.addItem`, { ns: 'workflow' })}
          onClick={handleAddPart}
        />
      )}
    </div>
  )
}

export default React.memo(MultimodalContentEditor)
