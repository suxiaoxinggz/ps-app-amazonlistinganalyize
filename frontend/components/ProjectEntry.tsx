"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FolderPlus, LogIn, Trash2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import axios from 'axios';
import StepGuide from '@/components/StepGuide';

interface ProjectInfo {
    project_id: string;
    name: string;
    contact?: string;
}

interface ProjectEntryProps {
    backendUrl: string;
    onProjectReady: (projectId: string, projectName: string) => void;
}

export default function ProjectEntry({ backendUrl, onProjectReady }: ProjectEntryProps) {

    // Create project state
    const [createName, setCreateName] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createContact, setCreateContact] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Login project state
    const [loginId, setLoginId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Delete project state
    const [showDelete, setShowDelete] = useState(false);
    const [deleteId, setDeleteId] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Admin state
    const [showAdmin, setShowAdmin] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    const handleCreate = async () => {
        if (!createName.trim()) { alert('Please enter a project name'); return; }
        if (!createPassword || createPassword.length < 4) { alert('Password must be at least 4 characters'); return; }

        setIsCreating(true);
        try {
            const response = await axios.post(`${backendUrl}/project/create`, {
                name: createName.trim(),
                password: createPassword,
                contact: createContact.trim(),
            });
            const data: ProjectInfo = response.data;
            alert(`Project created!\nProject ID: ${data.project_id}\n\n⚠️ Please save this ID — you need it to access your project later.`);
            onProjectReady(data.project_id, data.name);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            alert(`Failed to create project: ${err.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleLogin = async () => {
        if (!loginId.trim()) { alert('Please enter your Project ID'); return; }
        if (!loginPassword) { alert('Please enter your password'); return; }

        setIsLoggingIn(true);
        try {
            const response = await axios.post(`${backendUrl}/project/verify`, {
                project_id: loginId.trim(),
                password: loginPassword,
            });
            const data: ProjectInfo = response.data;
            onProjectReady(data.project_id, data.name);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            alert(`Login failed: ${err.response?.data?.detail || 'Invalid Project ID or password'}`);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId.trim() || !deletePassword) {
            alert('Please fill in all fields');
            return;
        }
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            await axios.post(`${backendUrl}/project/delete`, {
                project_id: deleteId.trim(),
                password: deletePassword,
            });
            alert('Project deleted successfully.');
            setShowDelete(false);
            setDeleteId('');
            setDeletePassword('');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            alert(`Delete failed: ${err.response?.data?.detail || 'Invalid credentials'}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAdminClear = async () => {
        if (!adminPassword) { alert('Please enter admin password'); return; }
        if (!confirm('⚠️ WARNING: This will permanently delete ALL projects and ALL data. Continue?')) return;
        if (!confirm('FINAL CONFIRMATION: ALL data will be lost. Are you absolutely sure?')) return;

        setIsClearing(true);
        try {
            await axios.post(`${backendUrl}/admin/clear`, {
                admin_password: adminPassword,
            });
            alert('All data cleared successfully.');
            setShowAdmin(false);
            setAdminPassword('');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            alert(`Admin action failed: ${err.response?.data?.detail || 'Invalid password'}`);
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Create New Project */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderPlus className="w-5 h-5" />
                        Create New Project
                    </CardTitle>
                    <CardDescription>
                        Create a project to isolate your keyword data. You&apos;ll get a unique Project ID.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <Label>Project Name *</Label>
                        <Input
                            placeholder="e.g. My Product Line, Q1 Analysis"
                            value={createName}
                            onChange={e => setCreateName(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Password * (min 4 characters)</Label>
                        <Input
                            type="password"
                            placeholder="Set a password to protect your project"
                            value={createPassword}
                            onChange={e => setCreatePassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Contact (optional)</Label>
                        <Input
                            placeholder="Email or name for reference"
                            value={createContact}
                            onChange={e => setCreateContact(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                        {isCreating ? 'Creating...' : 'Create Project'}
                    </Button>
                </CardContent>
            </Card>

            <div className="relative">
                <Separator />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-muted-foreground text-sm">
                    OR
                </span>
            </div>

            {/* Enter Existing Project */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LogIn className="w-5 h-5" />
                        Enter Existing Project
                    </CardTitle>
                    <CardDescription>
                        Access your previously created project with its ID and password.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <Label>Project ID *</Label>
                        <Input
                            placeholder="Enter your 8-character Project ID"
                            value={loginId}
                            onChange={e => setLoginId(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Password *</Label>
                        <Input
                            type="password"
                            placeholder="Enter your project password"
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full">
                        {isLoggingIn ? 'Verifying...' : 'Enter Project'}
                    </Button>
                </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex justify-between text-sm">
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowDelete(true)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Project
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowAdmin(true)}>
                    <ShieldAlert className="w-4 h-4 mr-1" />
                    Admin
                </Button>
            </div>

            {/* Delete Project Dialog */}
            <Dialog open={showDelete} onOpenChange={setShowDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the project and all its data.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Project ID</Label>
                            <Input value={deleteId} onChange={e => setDeleteId(e.target.value)} placeholder="Project ID" />
                        </div>
                        <div>
                            <Label>Password</Label>
                            <Input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Password" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Admin Dialog */}
            <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Admin: Clear All Data</DialogTitle>
                        <DialogDescription>
                            ⚠️ This will permanently delete ALL projects, keywords, and cached data. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Admin Password</Label>
                        <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Enter admin password" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdmin(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleAdminClear} disabled={isClearing}>
                            {isClearing ? 'Clearing...' : 'Clear All Data'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Operation Guide */}
            <StepGuide
                titleZh="项目管理操作指南"
                titleEn="Project Management Guide"
                steps={[
                    { zh: '填写项目名称、密码（至少4位）和联系方式，点击"Create Project"创建新项目', en: 'Fill in project name, password (min 4 chars), and contact info, then click "Create Project"' },
                    { zh: '创建成功后会获得一个8位项目ID，请妥善保存', en: 'After creation, you\'ll receive an 8-character Project ID — save it carefully' },
                    { zh: '再次访问时，输入项目ID和密码即可进入你的数据空间', en: 'To return, enter your Project ID and password to access your data' },
                    { zh: '每个项目的关键词数据、分析结果互相隔离', en: 'Each project\'s keyword data and analysis results are fully isolated' },
                ]}
                tips={[
                    { zh: '忘记项目ID将无法找回数据，建议截图保存', en: 'If you lose your Project ID, data cannot be recovered — screenshot it' },
                    { zh: '"删除项目"会永久删除该项目所有数据', en: '"Delete Project" permanently removes all data for that project' },
                    { zh: '"Admin"按钮仅供管理员使用，需要服务器配置的管理员密码', en: 'The "Admin" button is for administrators only, requires a server-configured password' },
                ]}
            />
        </div>
    );
}
