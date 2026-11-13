// Minimale Typen der File System Access API (Chrome/Edge), soweit nicht in lib.dom enthalten.
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}
interface FileSystemDirectoryHandle {
  queryPermission?(d?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(d?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}
interface Window {
  showDirectoryPicker?(options?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }): Promise<FileSystemDirectoryHandle>;
}
