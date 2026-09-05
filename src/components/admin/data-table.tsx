"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, Upload, X, Image } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "email" | "password" | "number" | "textarea" | "select" | "url" | "date" | "datetime-local" | "file";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  fetchOptions?: () => Promise<{ value: string; label: string }[]>;
  defaultValue?: string | number;
  hidden?: boolean;
  accept?: string;
  uploadType?: string;
  min?: number | string;
  max?: number | string;
}

interface DataTableProps<T> {
  title: string;
  endpoint: string;
  columns: Column<T>[];
  fields: FieldConfig[];
  searchPlaceholder?: string;
  createTitle?: string;
  editTitle?: string;
  onCreate?: (data: Record<string, any>) => Promise<any>;
  onUpdate?: (id: string, data: Record<string, any>) => Promise<any>;
  onDelete?: (id: string) => Promise<any>;
  renderRowActions?: (item: T) => React.ReactNode;
  defaultPayload?: Record<string, any>;
  extraParams?: Record<string, any>;
  imageField?: string;
}

/**
 * Process form data: convert booleans, dates, handle nested fields, strip empty values
 */
function processFormData(formData: Record<string, any>, isEdit = false): Record<string, any> {
  const processed: Record<string, any> = {};

  for (const [key, value] of Object.entries(formData)) {
    // Skip empty fields (including empty number strings)
    if (value === "" || value === null || value === undefined) continue;
    // Skip lone dash (user was typing a negative number)
    if (value === "-") continue;

    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      if (!processed[parent]) processed[parent] = {};
      processed[parent][child] = value;
    } else {
      processed[key] = value;
    }
  }

  // Convert string booleans to actual booleans
  const booleanKeys = ["isActive", "isPublished"];
  for (const key of booleanKeys) {
    if (key in processed) {
      if (processed[key] === "true") processed[key] = true;
      else if (processed[key] === "false") processed[key] = false;
    }
  }

  // Convert date strings to ISO format
  const dateKeys = Object.keys(processed).filter(
    (k) => k.includes('Date') || k.includes('date') || k === 'matchDate'
  );
  for (const key of dateKeys) {
    const val = processed[key];
    if (typeof val === 'string' && val && !val.includes('T')) {
      // Convert date-only to ISO
      processed[key] = new Date(val + 'T00:00:00.000Z').toISOString();
    } else if (typeof val === 'string' && val && val.includes('T') && !val.endsWith('Z')) {
      // datetime-local format: add seconds and timezone
      processed[key] = new Date(val + ':00').toISOString();
    }
  }

  // Clean up nested objects - remove fully empty ones
  for (const key of Object.keys(processed)) {
    if (typeof processed[key] === 'object' && !Array.isArray(processed[key]) && processed[key] !== null) {
      const allEmpty = Object.values(processed[key]).every(v => v === '' || v === null || v === undefined);
      if (allEmpty) delete processed[key];
    }
  }

  return processed;
}

/**
 * File upload field component using Cloudinary via backend
 */
function FileUploadField({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || "");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      const { data } = await api.post('/uploads', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.data.file.url;
      setPreview(url);
      onChange(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative group">
          <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 h-6 w-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-sm">Click to upload</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={field.accept || 'image/*'}
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}

export default function DataTable<T extends { _id: string }>({
  title,
  endpoint,
  columns,
  fields,
  searchPlaceholder = "Search...",
  createTitle = "Create",
  editTitle = "Edit",
  onCreate,
  onUpdate,
  onDelete,
  renderRowActions,
  defaultPayload,
  extraParams,
  imageField,
}: DataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  // Fetch dynamic options for select fields with fetchOptions
  useEffect(() => {
    for (const field of fields) {
      if (field.fetchOptions && !dynamicOptions[field.key]) {
        field.fetchOptions().then((opts) => {
          setDynamicOptions((prev) => ({ ...prev, [field.key]: opts }));
        }).catch(() => {});
      }
    }
  }, [fields]);

  const getFieldOptions = (field: FieldConfig) => {
    if (dynamicOptions[field.key]) return dynamicOptions[field.key];
    return field.options || [];
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10, ...extraParams };
      if (search) params.search = search;
      const { data: res } = await api.get(endpoint, { params });
      setData(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, search, extraParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    const defaults: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
      else defaults[f.key] = "";
    });
    setFormData(defaults);
    setCreateOpen(true);
  };

  const handleEdit = (item: T) => {
    setSelected(item);
    const form: Record<string, any> = {};
    fields.forEach((f) => {
      // Handle nested field access (e.g., "stadium.name")
      const keys = f.key.split('.');
      let val: any = item as any;
      for (const key of keys) {
        val = val?.[key];
      }
      
      if (f.type === "datetime-local" && val) {
        form[f.key] = new Date(val).toISOString().slice(0, 16);
      } else if (f.type === "date" && val) {
        form[f.key] = new Date(val).toISOString().slice(0, 10);
      } else if (typeof val === "object" && val !== null && !keys.includes('name')) {
        form[f.key] = JSON.stringify(val);
      } else {
        form[f.key] = val ?? "";
      }
    });
    setFormData(form);
    setEditOpen(true);
  };

  const handleDelete = (item: T) => {
    setSelected(item);
    setDeleteOpen(true);
  };

  const submitCreate = async () => {
    setSubmitting(true);
    try {
      const processedData = processFormData(formData);
      const payload = { ...defaultPayload, ...processedData };
      if (onCreate) await onCreate(payload);
      else await api.post(endpoint, payload);
      setCreateOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const processedData = processFormData(formData, true);
      const payload = { ...defaultPayload, ...processedData };
      if (onUpdate) await onUpdate(selected._id, payload);
      else await api.patch(`${endpoint}/${selected._id}`, payload);
      setEditOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      if (onDelete) await onDelete(selected._id);
      else await api.delete(`${endpoint}/${selected._id}`);
      setDeleteOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to delete");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    if (field.hidden) return null;
    const value = formData[field.key] ?? "";

    if (field.type === "file") {
      return (
        <FileUploadField
          field={field}
          value={value}
          onChange={(url) => setFormData({ ...formData, [field.key]: url })}
        />
      );
    }

    switch (field.type) {
      case "select": {
        const opts = getFieldOptions(field);
        const matchedLabel = opts.find((o) => o.value === String(value))?.label;
        return (
          <Select value={String(value)} onValueChange={(v) => setFormData({ ...formData, [field.key]: v })}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`}>{matchedLabel || String(value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {opts.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "textarea":
        return <Textarea value={value} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} placeholder={field.placeholder} />;
      case "number":
        return (
          <Input
            type="number"
            value={value === 0 && formData[field.key] === 0 ? value : value}
            min={field.min}
            max={field.max}
            onChange={(e) => {
              const raw = e.target.value;
              // Allow empty field (user is deleting)
              if (raw === "" || raw === "-") {
                setFormData({ ...formData, [field.key]: raw });
                return;
              }
              const num = Number(raw);
              if (!isNaN(num)) {
                setFormData({ ...formData, [field.key]: num });
              }
            }}
            onBlur={(e) => {
              // On blur, convert empty/dash to empty string
              const raw = e.target.value;
              if (raw === "" || raw === "-") {
                setFormData({ ...formData, [field.key]: "" });
              }
            }}
            placeholder={field.placeholder}
          />
        );
      default:
        return (
          <Input
            type={field.type}
            value={value}
            min={field.min}
            max={field.max}
            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <Button onClick={handleCreate} className="gap-2 flex-shrink-0">
          <Plus className="h-4 w-4" /> Add {title.replace(/s$/, "")}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3 pb-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data found
              </div>
            ) : (
              data.map((item) => (
                <div key={item._id} className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  {imageField && (
                    <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
                      {(item as any)[imageField] ? (
                        <img src={(item as any)[imageField]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {columns.slice(0, 2).map((col) => (
                          <div key={col.key} className="text-sm">
                            <span className="text-muted-foreground text-xs">{col.label}:</span>
                            <span className="font-medium ml-1">
                              {col.render ? col.render(item) : (item as any)[col.key]}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {renderRowActions && renderRowActions(item)}
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="h-7 w-7 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {columns.length > 2 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {columns.slice(2).map((col) => (
                          <div key={col.key} className="text-xs text-muted-foreground">
                            <span className="font-medium">{col.label}:</span>
                            <span className="ml-1">
                              {col.render ? col.render(item) : (item as any)[col.key]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {imageField && <TableHead className="w-12">Photo</TableHead>}
                  {columns.map((col) => (
                    <TableHead key={col.key} className={col.className}>{col.label}</TableHead>
                  ))}
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1 + (imageField ? 1 : 0)} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1 + (imageField ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                      No data found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item._id}>
                      {imageField && (
                        <TableCell>
                          {(item as any)[imageField] ? (
                            <img src={(item as any)[imageField]} alt="" className="h-9 w-9 rounded-md object-cover border" />
                          ) : (
                            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                              <Image className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render ? col.render(item) : (item as any)[col.key]}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {renderRowActions && renderRowActions(item)}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="px-4 pt-4 pb-2"><DialogTitle>{createTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4 px-4 overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {fields.filter(f => !f.hidden).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                {renderField(field)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="px-4 pt-4 pb-2"><DialogTitle>{editTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4 px-4 overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {fields.filter(f => !f.hidden).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                {renderField(field)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this item? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
