"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, LogIn, Trash2, ShieldAlert, RefreshCw, User, Calendar } from 'lucide-react';
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

    // Password dialog
    const [selectedProject, setSelectedProject] = useState<ProjectListItem | null>(null);
    const [enterPassword, setEnterPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Create project
    const [createName, setCreateName] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createContact, setCreateContact] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Delete
    const [showDelete, setShowDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Admin
    const [showAdmin, setShowAdmin] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    const fetchProjects = async () => {
        setIsLoadingProjects(true);
        try {
            const response = await axios.get(`${backendUrl}/project/list`);
            setProjects(response.data || []);
        } catch {
            setProjects([]);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    useEffect(() => { fetchProjects(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSelectProject = (project: ProjectListItem) => {
        setSelectedProject(project);
        setEnterPassword('');
    };

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

    const handleCreate = async () => {
        if (!createName.trim()) { alert('请输入项目名称 / Please enter a project name'); return; }
        if (!createPassword || createPassword.length < 4) { alert('密码至少4位 / Password min 4 characters'); return; }

        setIsCreating(true);
        try {
            const response = await axios.post(`${backendUrl}/project/create`, {
                name: createName.trim(),
                password: createPassword,
                contact: createContact.trim(),
            });
            const data = response.data;
            alert(`项目已创建！/ Project created!\n\nProject ID: ${data.project_id}\n⚠️ 请保存此ID / Please save this ID`);
            setCreateName('');
            setCreatePassword('');
            setCreateContact('');
            fetchProjects();
            onProjectReady(data.project_id, data.name);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            alert(`创建失败: ${err.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget || !deletePassword) return;
        if (!confirm(`确定删除 "${deleteTarget.name}"? 不可恢复!\nDelete "${deleteTarget.name}"? Cannot be undone!`)) return;

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
            alert('密码错误 / Incorrect password');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAdminClear = async () => {
        if (!adminPassword) return;
        if (!confirm('⚠️ 永久删除所有数据！/ Delete ALL data permanently!')) return;
        if (!confirm('最终确认！/ Final confirmation!')) return;

        setIsClearing(true);
        try {
            await axios.post(`${backendUrl}/admin/clear`, { admin_password: adminPassword });
            alert('已清空 / All cleared');
            setShowAdmin(false);
            setAdminPassword('');
            fetchProjects();
        } catch {
            alert('密码错误 / Invalid password');
        } finally {
            setIsClearing(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try { return new Date(dateStr).toLocaleDateString('zh-CN'); } catch { return ''; }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* ===== Create New Project (always visible) ===== */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderPlus className="w-5 h-5" />
                        创建新项目 / Create New Project
                    </CardTitle>
                    <CardDescription>
                        设置项目名称和密码来创建独立的数据空间 / Set up a name and password for an isolated workspace
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <Label>项目名称 / Project Name *</Label>
                        <Input placeholder="e.g. My Product Line, Q1 Analysis" value={createName} onChange={e => setCreateName(e.target.value)} />
                    </div>
                    <div>
                        <Label>密码 / Password * (≥4位)</Label>
                        <Input type="password" placeholder="设置项目密码 / Set a password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} />
                    </div>
                    <div>
                        <Label>联系方式 / Contact (可选 / optional)</Label>
                        <Input placeholder="Email or name" value={createContact} onChange={e => setCreateContact(e.target.value)} />
                    </div>
                    <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                        {isCreating ? '创建中... / Creating...' : '创建项目 / Create Project'}
                    </Button>
                </CardContent>
            </Card>

            {/* Divider */}
            <div className="relative">
                <Separator />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-muted-foreground text-sm">
                    已有项目 / Existing Projects
                </span>
            </div>

            {/* ===== Project List ===== */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                            点击项目输入密码进入 / Click a project to enter
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={fetchProjects} disabled={isLoadingProjects}>
                            <RefreshCw className={`w-4 h-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingProjects ? (
                        <div className="text-center py-6 text-muted-foreground">加载中... / Loading...</div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                            暂无项目，请先创建 / No projects yet, create one above
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {projects.map((project) => (
                                <div
                                    key={project.project_id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent hover:border-primary/30 cursor-pointer transition-all group"
                                    onClick={() => handleSelectProject(project)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                                            <LogIn className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium truncate text-sm">{project.name}</div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-mono">ID: {project.project_id}</span>
                                                {project.contact && (
                                                    <span className="flex items-center gap-0.5"><User className="w-3 h-3" /> {project.contact}</span>
                                                )}
                                                {project.created_at && (
                                                    <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> {formatDate(project.created_at)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); setDeletePassword(''); setShowDelete(true); }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Badge variant="secondary" className="text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            进入 →
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Admin */}
            <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setShowAdmin(true)}>
                    <ShieldAlert className="w-3 h-3 mr-1" /> Admin
                </Button>
            </div>

            {/* ===== Password Dialog ===== */}
            <Dialog open={!!selectedProject} onOpenChange={(open) => { if (!open) setSelectedProject(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>进入项目 / Enter Project</DialogTitle>
                        <DialogDescription>
                            {selectedProject?.name} <span className="font-mono text-xs">({selectedProject?.project_id})</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>密码 / Password</Label>
                        <Input
                            type="password" placeholder="输入项目密码"
                            value={enterPassword} onChange={e => setEnterPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleVerify()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedProject(null)}>取消</Button>
                        <Button onClick={handleVerify} disabled={isVerifying || !enterPassword}>
                            {isVerifying ? '验证中...' : '进入 / Enter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={showDelete} onOpenChange={setShowDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">删除项目 / Delete Project</DialogTitle>
                        <DialogDescription>删除 &quot;{deleteTarget?.name}&quot; 及所有数据，不可恢复</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>密码 / Password</Label>
                        <Input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                            placeholder="输入项目密码确认" onKeyDown={e => e.key === 'Enter' && handleDelete()} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDelete(false)}>取消</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !deletePassword}>
                            {isDeleting ? '删除中...' : '确认删除'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Admin Dialog */}
            <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">管理员：清空所有</DialogTitle>
                        <DialogDescription>⚠️ 永久删除所有项目和数据</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>管理员密码</Label>
                        <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Admin password" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdmin(false)}>取消</Button>
                        <Button variant="destructive" onClick={handleAdminClear} disabled={isClearing || !adminPassword}>
                            {isClearing ? '清空中...' : '清空所有'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Guide */}
            <StepGuide
                titleZh="操作指南" titleEn="Guide"
                steps={[
                    { zh: '填写名称和密码，点击"创建项目"建立新项目', en: 'Fill name and password, click "Create Project"' },
                    { zh: '从下方列表点击已有项目，输入密码即可进入', en: 'Click a project from the list below, enter password to access' },
                    { zh: '每个项目的数据互相隔离', en: 'Each project\'s data is fully isolated' },
                ]}
                tips={[
                    { zh: '悬停项目可看到删除按钮', en: 'Hover to see delete button' },
                ]}
            />
        </div>
    );
}
