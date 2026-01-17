'use client';

import { Home, Folder, FolderOpen, FileText, ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WikiSection, WikiTreeNode } from './wiki-structured';

interface WikiSidebarTreeProps {
  sections: WikiSection[];
  activeId: string;
  openMap: Record<string, boolean>;
  onToggleOpen: (id: string) => void;
  onExpandAll: () => void;
  onSelect: (id: string) => void;
}

export function WikiSidebarTree({
  sections,
  activeId,
  openMap,
  onToggleOpen,
  onExpandAll,
  onSelect
}: WikiSidebarTreeProps) {
  const hasContent = sections.length > 0 && sections.some((s) => s.nodes.length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-card">
      {/* Header */}
      <div className="p-4">
        <div className="text-sm font-semibold">Navigation Wiki</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Parcourez vos documents et dossiers
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant={activeId === 'home' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect('home')}
          >
            <Home className="mr-1 h-3 w-3" />
            Accueil
          </Button>
          {hasContent && (
            <Button variant="outline" size="sm" onClick={onExpandAll}>
              <ChevronsUpDown className="mr-1 h-3 w-3" />
              Tout déplier
            </Button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-2">
        {sections.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            activeId={activeId}
            openMap={openMap}
            onToggleOpen={onToggleOpen}
            onSelect={onSelect}
          />
        ))}

        {!hasContent && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Aucun document. Créez votre premier document.
          </p>
        )}
      </div>
    </div>
  );
}

interface SectionItemProps {
  section: WikiSection;
  activeId: string;
  openMap: Record<string, boolean>;
  onToggleOpen: (id: string) => void;
  onSelect: (id: string) => void;
}

function SectionItem({ section, activeId, openMap, onToggleOpen, onSelect }: SectionItemProps) {
  const isOpen = !!openMap[section.id];
  const hasNodes = section.nodes.length > 0;

  if (!hasNodes) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => onToggleOpen(section.id)}
        className="flex w-full items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{section.title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="mt-1 space-y-0.5">
          {section.nodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              activeId={activeId}
              openMap={openMap}
              onToggleOpen={onToggleOpen}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeNodeProps {
  node: WikiTreeNode;
  level: number;
  activeId: string;
  openMap: Record<string, boolean>;
  onToggleOpen: (id: string) => void;
  onSelect: (id: string) => void;
}

function TreeNode({ node, level, activeId, openMap, onToggleOpen, onSelect }: TreeNodeProps) {
  const isFolder = node.type === 'folder';
  const isOpen = !!openMap[node.id];
  const isActive = activeId === node.id;
  const hasChildren = isFolder && node.nodes && node.nodes.length > 0;

  const handleClick = () => {
    if (isFolder) {
      onToggleOpen(node.id);
    } else {
      onSelect(node.id);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          isActive
            ? 'bg-primary/10 font-medium text-primary'
            : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Chevron for folders */}
        {isFolder ? (
          <span className="flex h-4 w-4 items-center justify-center">
            {hasChildren ? (
              isOpen ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )
            ) : null}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {isFolder ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Title */}
        <span className={cn('flex-1 truncate', isFolder && 'font-medium')}>
          {node.title}
        </span>
      </button>

      {/* Children */}
      {isFolder && isOpen && node.nodes && (
        <div className="mt-0.5">
          {node.nodes.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              activeId={activeId}
              openMap={openMap}
              onToggleOpen={onToggleOpen}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
