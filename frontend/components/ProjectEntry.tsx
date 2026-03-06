"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, LogIn, Trash2, ShieldAlert, RefreshCw, FolderOpen, User, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import axios from 'axios';
import StepGuide from '@/components/StepGuide';

interface ProjectListItem {
    project_id: string;
    name: string;
    contact?: string;
    created_at?: string;
}

interface ProjectEntryProps {
    backendUrl: string;
    onProjectReady: (projectId: string, projectName: string) => void;
}

export default function ProjectEntry({ backendUrl, onProjectReady }: ProjectEntryProps) {
    // Project list
    const [projects, setProjects] = useState<ProjectListItem[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);

    // Password dialog for selecting a project
    const [selectedProject, setSelectedProject] = useState<ProjectListItem | null>(null);
    const [enterPassword, setEnterPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Create project state
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createContact, setCreateContact] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Delete project state
    const [showDelete, setShowDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Admin state
    const [showAdmin, setShowAdmin] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    // Fetch project list on mount
    const fetchProjects = async () => {
        setIsLoadingProjects(true);
        try {
            const response = await axios.get(`${backendUrl}/project/list`);
            setProjects(response.data || []);
        } catch {
            console.error('Failed to fetch projects');
            setProjects([]);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    useEffect(() => { fetchProjects(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Click a project -> open password dialog
    const handleSelectProject = (project: ProjectListItem) => {
        setSelectedProject(project);
        setEnterPassword('');
    };

    // Verify password and enter project
    const handleVerify = async () => {
        if (!selectedProject || !enterPassword) return;
        setIsVerifying(true);
        try {
            const response = await axios.post(`${backendUrl}/project/verify`, {
                project_id: selectedProject.project_id,
                password: enterPassword,
            });
            onProjectReady(response.data.project_id, response.data.name);
        } catch {
            alert('密码错误 / Incorrect password');
        } finally {
            setIsVerifying(false);
        }
    };

    // Create a new project
    const handleCreate = async () => {
        if (!createName.trim()) { alert('请输入项目名称 / Please enter a project name'); return; }
        if (!createPassword || createPassword.length < 4) { alert('密码至少4位 / Password must be at least 4 characters'); return; }

        setIsCreating(true);
        try {
            const response = await axios.post(`${backendUrl}/project/create`, {
                name: createName.trim(),
                password: createPassword,
                contact: createContact.trim(),
            });
            const data = response.data;
            alert(`项目已创建！/ Project created!\n\nProject ID: ${data.project_id}\n\n⚠️ 请保存此ID / Please save this ID`);
            setShowCreate(false);
            setCreateName('');
            setCreatePassword('');
            setCreateContact('');
            fetchProjects();
            onProjectReady(data.project_id, data.name);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            alert(`创建失败 / Create failed: ${err.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setIsCreating(false);
        }
    };

    // Delete a project
    const handleDelete = async () => {
        if (!deleteTarget || !deletePassword) return;
        if (!confirm(`确定删除项目 "${deleteTarget.name}" 吗？此操作不可恢复。\nDelete project "${deleteTarget.name}"? This cannot be undone.`)) return;

        setIsDeleting(true);
        try {
            await axios.post(`${backendUrl}/project/delete`, {
                project_id: deleteTarget.project_id,
                password: deletePassword,
            });
            alert('项目已删除 / Project deleted');
            setShowDelete(false);
            setDeleteTarget(null);
            setDeletePassword('');
            fetchProjects();
        } catch {
            alert('删除失败：密码错误 / Delete failed: incorrect password');
        } finally {
            setIsDeleting(false);
        }
    };

    // Admin clear all
    const handleAdminClear = async () => {
        if (!adminPassword) return;
        if (!confirm('⚠️ 这将永久删除所有数据！\nThis will permanently delete ALL data!')) return;
        if (!confirm('最终确认：所有数据将丢失。\nFinal confirmation: ALL data will be lost.')) return;

        setIsClearing(true);
        try {
            await axios.post(`${backendUrl}/admin/clear`, { admin_password: adminPassword });
            alert('所有数据已清空 / All data cleared');
            setShowAdmin(false);
            setAdminPassword('');
            fetchProjects();
        } catch {
            alert('管理员密码错误 / Invalid admin password');
        } finally {
            setIsClearing(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch { return ''; }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Project List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FolderOpen className="w-5 h-5" />
                                选择项目 / Select Project
                            </CardTitle>
                            <CardDescription className="mt-1">
                                点击项目进入，或创建新项目 / Click a project to enter, or create a new one
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchProjects} disabled={isLoadingProjects}>
                            <RefreshCw className={`w-4 h-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {isLoadingProjects ? (
                        <div className="text-center py-8 text-muted-foreground">加载中... / Loading...</div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="mb-2">暂无项目 / No projects yet</p>
                            <p className="text-sm">点击下方按钮创建第一个项目 / Click below to create your first project</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {projects.map((project) => (
                                <div
                                    key={project.project_id}
                                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent hover:border-primary/30 cursor-pointer transition-all group"
                                    onClick={() => handleSelectProject(project)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                            <LogIn className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium truncate">{project.name}</div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                <span className="font-mono">ID: {project.project_id}</span>
                                                {project.contact && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" /> {project.contact}
                                                    </span>
                                                )}
                                                {project.created_at && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {formatDate(project.created_at)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget(project);
                                                setDeletePassword('');
                                                setShowDelete(true);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            进入 / Enter →
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Create New Project Button */}
                    <Button
                        variant="outline"
                        className="w-full border-dashed py-6 gap-2 mt-4"
                        onClick={() => setShowCreate(true)}
                    >
                        <FolderPlus className="w-4 h-4" />
                        创建新项目 / Create New Project
                    </Button>
                </CardContent>
            </Card>

            {/* Admin button */}
            <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setShowAdmin(true)}>
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    Admin
                </Button>
            </div>

            {/* Password Dialog — enter selected project */}
            <Dialog open={!!selectedProject} onOpenChange={(open) => { if (!open) setSelectedProject(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LogIn className="w-5 h-5" />
                            进入项目 / Enter Project
                        </DialogTitle>
                        <DialogDescription>
                            {selectedProject?.name} <span className="font-mono text-xs">({selectedProject?.project_id})</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>密码 / Password</Label>
                        <Input
                            type="password"
                            placeholder="输入项目密码 / Enter project password"
                            value={enterPassword}
                            onChange={e => setEnterPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleVerify()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedProject(null)}>取消 / Cancel</Button>
                        <Button onClick={handleVerify} disabled={isVerifying || !enterPassword}>
                            {isVerifying ? '验证中...' : '进入 / Enter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Project Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderPlus className="w-5 h-5" />
                            创建新项目 / Create New Project
                        </DialogTitle>
                        <DialogDescription>
                            创建后会获得唯一的项目ID / You&apos;ll get a unique Project ID after creation
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>项目名称 / Project Name *</Label>
                            <Input placeholder="e.g. My Product Line" value={createName} onChange={e => setCreateName(e.target.value)} />
                        </div>
                        <div>
                            <Label>密码 / Password * (≥4位)</Label>
                            <Input type="password" placeholder="设置项目密码" value={createPassword} onChange={e => setCreatePassword(e.target.value)} />
                        </div>
                        <div>
                            <Label>联系方式 / Contact (可选)</Label>
                            <Input placeholder="Email or name" value={createContact} onChange={e => setCreateContact(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>取消 / Cancel</Button>
                        <Button onClick={handleCreate} disabled={isCreating}>
                            {isCreating ? '创建中...' : '创建 / Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Project Dialog */}
            <Dialog open={showDelete} onOpenChange={setShowDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">删除项目 / Delete Project</DialogTitle>
                        <DialogDescription>
                            删除 &quot;{deleteTarget?.name}&quot; 及其所有数据，此操作无法恢复。
                            <br />
                            Delete &quot;{deleteTarget?.name}&quot; and all its data. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>密码 / Password</Label>
                        <Input
                            type="password"
                            value={deletePassword}
                            onChange={e => setDeletePassword(e.target.value)}
                            placeholder="输入项目密码确认删除"
                            onKeyDown={e => e.key === 'Enter' && handleDelete()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDelete(false)}>取消 / Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !deletePassword}>
                            {isDeleting ? '删除中...' : '确认删除 / Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Admin Dialog */}
            <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">管理员：清空所有数据 / Admin: Clear All</DialogTitle>
                        <DialogDescription>
                            ⚠️ 这将永久删除所有项目和数据，无法恢复。
                            <br />
                            This will permanently delete ALL projects and data.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>管理员密码 / Admin Password</Label>
                        <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Enter admin password" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdmin(false)}>取消 / Cancel</Button>
                        <Button variant="destructive" onClick={handleAdminClear} disabled={isClearing || !adminPassword}>
                            {isClearing ? '清空中...' : '清空所有 / Clear All'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Operation Guide */}
            <StepGuide
                titleZh="项目管理操作指南"
                titleEn="Project Management Guide"
                steps={[
                    { zh: '从列表中点击已有项目，输入密码即可进入', en: 'Click an existing project from the list, enter password to access' },
                    { zh: '点击"创建新项目"按钮新建项目，设置名称和密码', en: 'Click "Create New Project" to set up a new project with name and password' },
                    { zh: '创建成功后记住项目ID，下次直接从列表点击进入', en: 'Remember your Project ID after creation, enter directly from the list next time' },
                    { zh: '每个项目的关键词数据、分析结果互相隔离', en: 'Each project\'s keyword data and analysis results are fully isolated' },
                ]}
                tips={[
                    { zh: '悬停项目行可看到删除按钮，需输入密码确认', en: 'Hover over a project to see the delete button, password required' },
                    { zh: '"Admin"按钮仅供管理员使用，需要服务器配置的管理员密码', en: 'The "Admin" button is for administrators only, requires server-configured password' },
                ]}
            />
        </div>
    );
}
