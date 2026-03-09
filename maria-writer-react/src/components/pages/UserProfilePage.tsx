import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, LogOut, Plus, RefreshCw, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStore, initialState } from '../../context/StoreContext';
import { addProfileAsCharacter } from '@utils/profileCharacter';
import { AppPageLayout } from '../templates/AppPageLayout';
import { Button } from '../atoms/Button';
import { DateTimeInput } from '../molecules/DateTimeInput';
import { TagInput } from '../molecules/TagInput';
import { CreatorConnectionsGraph } from '../molecules/CreatorConnectionsGraph';
import { CloudProject, cloudStorageService } from '../../services/cloudStorage';
import type { CreatorConnection, UpdateProfilePayload } from '../../services/authService';
import { resizeToDataUrl } from '../../utils/avatar';
import { buildLoadedState, validateImportedState } from '../../utils/projectLoad';
import { loadGuestSnapshot, saveToLocal } from '../../utils/storage';
import styles from './UserProfilePage.module.scss';

function splitCsv(value?: string | null): string[] {
  return value
    ? value.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
}

export const UserProfilePage: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateProfilePayload & { creatorConnections: CreatorConnection[] }>({
    displayName: '',
    genreTags: '',
    profilePicture: null,
    dob: '',
    aliases: '',
    bio: '',
    profileColor: '#4f46e5',
    creatorConnections: [],
  });

  if (!user) {
    return null;
  }

  useEffect(() => {
    setForm({
      displayName: user.displayName ?? '',
      genreTags: user.genreTags ?? '',
      profilePicture: user.profilePicture ?? null,
      dob: user.dob ?? '',
      aliases: user.aliases ?? '',
      bio: user.bio ?? '',
      profileColor: user.profileColor ?? '#4f46e5',
      creatorConnections: user.creatorConnections ?? [],
    });
  }, [user]);

  useEffect(() => {
    void refreshCloudProjects();
  }, []);

  const guestId = cloudStorageService.getGuestId();
  const name = user.displayName || user.username;
  const initials = name.charAt(0).toUpperCase();
  const genreTags = splitCsv(isEditing ? form.genreTags : user.genreTags);
  const aliases = splitCsv(isEditing ? form.aliases : user.aliases);
  const projectTitle = state.meta.title || 'Current Project';
  const profileColor = form.profileColor || user.profileColor || '#4f46e5';
  const creatorConnections = form.creatorConnections ?? [];

  const groupedConnections = useMemo(() => {
    return {
      follow: creatorConnections.filter((connection) => connection.kind === 'follow'),
      privateRead: creatorConnections.filter((connection) => connection.kind === 'private-read'),
      collaborator: creatorConnections.filter((connection) => connection.kind === 'collaborator'),
    };
  }, [creatorConnections]);

  const handleCopyGuestId = () => {
    navigator.clipboard.writeText(guestId);
  };

  const refreshCloudProjects = async () => {
    setIsLoadingCloud(true);
    setCloudError(null);
    try {
      const projects = await cloudStorageService.listProjects();
      setCloudProjects(projects);
    } catch (error: any) {
      setCloudError(error?.message || 'Failed to load cloud projects.');
      setCloudProjects([]);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    try {
      const dataUrl = await resizeToDataUrl(file);
      setForm((prev) => ({ ...prev, profilePicture: dataUrl }));
    } catch {
      setSaveError('Could not process that image. Please try another file.');
    }
  };

  const handleConnectionChange = (index: number, updates: Partial<CreatorConnection>) => {
    setForm((prev) => ({
      ...prev,
      creatorConnections: prev.creatorConnections.map((connection, currentIndex) =>
        currentIndex === index ? { ...connection, ...updates } : connection,
      ),
    }));
  };

  const handleAddConnection = () => {
    setForm((prev) => ({
      ...prev,
      creatorConnections: [
        ...prev.creatorConnections,
        { id: `conn-${Date.now()}-${prev.creatorConnections.length}`, name: '', kind: 'follow', note: '' },
      ],
    }));
  };

  const handleRemoveConnection = (index: number) => {
    setForm((prev) => ({
      ...prev,
      creatorConnections: prev.creatorConnections.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
    setSaveSuccess(null);
    setForm({
      displayName: user.displayName ?? '',
      genreTags: user.genreTags ?? '',
      profilePicture: user.profilePicture ?? null,
      dob: user.dob ?? '',
      aliases: user.aliases ?? '',
      bio: user.bio ?? '',
      profileColor: user.profileColor ?? '#4f46e5',
      creatorConnections: user.creatorConnections ?? [],
    });
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const payload: UpdateProfilePayload = {
        displayName: form.displayName?.trim() || null,
        genreTags: genreTags.join(', ') || null,
        profilePicture: form.profilePicture || null,
        dob: form.dob?.trim() || null,
        aliases: aliases.join(', ') || null,
        bio: form.bio?.trim() || null,
        profileColor: profileColor,
        creatorConnections: creatorConnections
          .filter((connection) => connection.name.trim())
          .map((connection) => ({
            ...connection,
            name: connection.name.trim(),
            note: connection.note?.trim() || undefined,
          })),
      };

      await updateProfile(payload);
      setIsEditing(false);
      setSaveSuccess('Profile updated.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickLoad = async (projectId: string) => {
    setLoadingProjectId(projectId);
    setCloudError(null);
    try {
      saveToLocal(state);
      const loaded = await cloudStorageService.loadFromCloud(projectId);
      const validationError = validateImportedState(loaded);
      if (validationError) {
        setCloudError(`Cloud project is invalid: ${validationError}`);
        return;
      }

      const nextState = buildLoadedState(loaded, state, projectId);
      dispatch({ type: 'LOAD_STATE', payload: nextState });
      navigate('/editor');
    } catch (error: any) {
      setCloudError(error?.message || 'Failed to load selected cloud project.');
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleCreateCharacter = () => {
    addProfileAsCharacter({ ...user, profileColor, creatorConnections }, dispatch);
    navigate('/editor');
  };

  const handleLogout = async () => {
    await logout();
    const snapshot = loadGuestSnapshot();
    const restored = snapshot
      ? { ...initialState, ...snapshot, activeModal: 'none' as const, editingItemId: null, viewingItemId: null }
      : initialState;

    dispatch({ type: 'LOAD_STATE', payload: restored });
    navigate('/login', { replace: true });
  };

  return (
    <AppPageLayout
      headerActions={
        <div className={styles.headerActions}>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/editor')}>
            Back to Editor
          </Button>
          {isEditing ? (
            <>
              <Button variant="secondary" icon={X} onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="primary" icon={Save} onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Profile'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      }
    >
      <div className={styles.page}>
        {saveError && <div className={styles.errorBanner} role="alert">{saveError}</div>}
        {saveSuccess && <div className={styles.successBanner}>{saveSuccess}</div>}

        <div className={styles.hero}>
          <div className={styles.avatarColumn}>
            <div className={styles.avatar} style={{ outlineColor: profileColor }}>
              {form.profilePicture ? (
                <img src={form.profilePicture} alt={name} />
              ) : (
                <div className={styles.avatarPlaceholder} style={{ color: profileColor }}>{initials}</div>
              )}
            </div>
            {isEditing && (
              <div className={styles.avatarControls}>
                <Button variant="secondary" size="sm" onClick={() => avatarInputRef.current?.click()}>
                  Change photo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setForm((prev) => ({ ...prev, profilePicture: null }))}>
                  Remove
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenInput}
                  onChange={handleAvatarChange}
                />
              </div>
            )}
          </div>

          <div className={styles.heroInfo}>
            <div className={styles.kicker}>User Profile</div>
            {isEditing ? (
              <div className={styles.editGrid}>
                <div className={styles.field}>
                  <label htmlFor="displayName">Display name</label>
                  <input
                    id="displayName"
                    className={styles.input}
                    value={form.displayName ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                    placeholder="How you appear in the app"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="profileColor">Profile colour</label>
                  <div className={styles.colorPicker}>
                    <input
                      id="profileColor"
                      type="color"
                      value={profileColor}
                      onChange={(event) => setForm((prev) => ({ ...prev, profileColor: event.target.value }))}
                      className={styles.colorWheel}
                    />
                    <input
                      className={styles.input}
                      value={profileColor}
                      onChange={(event) => {
                        const next = event.target.value;
                        if (next.startsWith('#') && next.length <= 7) {
                          setForm((prev) => ({ ...prev, profileColor: next }));
                        }
                      }}
                    />
                    <span className={styles.colorPreview} style={{ backgroundColor: profileColor }} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className={styles.name}>{name}</h1>
                <p className={styles.username}>@{user.username}</p>
              </>
            )}
            <div className={styles.metaRow}>
              <span>{user.role}</span>
              <span>•</span>
              <span>{user.tier}</span>
              <span>•</span>
              <span>{user.email}</span>
            </div>

            {isEditing ? (
              <div className={styles.field}>
                <label>Genre tags</label>
                <TagInput tags={genreTags} onChange={(tags) => setForm((prev) => ({ ...prev, genreTags: tags.join(', ') }))} color="indigo" />
              </div>
            ) : genreTags.length > 0 ? (
              <div className={styles.tags}>
                {genreTags.map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>About</h2>
            </div>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Date of birth</span>
                {isEditing ? (
                  <DateTimeInput value={form.dob ?? ''} onChange={(dob) => setForm((prev) => ({ ...prev, dob }))} className={styles.input} />
                ) : (
                  <span className={styles.value}>{user.dob || 'Not set yet'}</span>
                )}
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Aliases</span>
                {isEditing ? (
                  <TagInput tags={aliases} onChange={(tags) => setForm((prev) => ({ ...prev, aliases: tags.join(', ') }))} color="emerald" />
                ) : aliases.length > 0 ? (
                  <div className={styles.tags}>
                    {aliases.map((alias) => (
                      <span key={alias} className={styles.aliasTag}>{alias}</span>
                    ))}
                  </div>
                ) : (
                  <span className={styles.value}>No aliases added yet</span>
                )}
              </div>
            </div>
            <div className={styles.descriptionBlock}>
              <h3>Bio</h3>
              {isEditing ? (
                <textarea
                  className={styles.textarea}
                  rows={5}
                  value={form.bio ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                  placeholder="Tell readers a little about yourself here."
                />
              ) : (
                <p className={styles.description}>{user.bio || 'Tell readers a little about yourself here.'}</p>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Account</h2>
            </div>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{user.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Guest ID</span>
                <span className={styles.valueMono}>{guestId}</span>
                <button className={styles.iconButton} onClick={handleCopyGuestId} aria-label="Copy Guest ID">
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div className={styles.actions}>
              <Button variant="primary" icon={Sparkles} onClick={handleCreateCharacter}>
                Create Character in “{projectTitle}”
              </Button>
              <Button variant="danger" icon={LogOut} onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </section>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Cloud projects</h2>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refreshCloudProjects} disabled={isLoadingCloud}>
              {isLoadingCloud ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          {cloudError && <div className={styles.errorBanner} role="alert">{cloudError}</div>}
          {cloudProjects.length === 0 && !isLoadingCloud ? (
            <p className={styles.muted}>No cloud projects yet.</p>
          ) : (
            <div className={styles.projectList}>
              {cloudProjects.map((project) => (
                <div key={project.id} className={styles.projectCard}>
                  <div>
                    <h3>{project.title}</h3>
                    <p>Updated {new Date(project.updatedAt).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleQuickLoad(project.id)}
                    disabled={loadingProjectId === project.id}
                  >
                    {loadingProjectId === project.id ? 'Loading…' : 'Quick Load'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Creator relationships</h2>
            {isEditing && (
              <Button variant="secondary" size="sm" icon={Plus} onClick={handleAddConnection}>
                Add connection
              </Button>
            )}
          </div>

          <CreatorConnectionsGraph userLabel={name} color={profileColor} connections={creatorConnections.filter((connection) => connection.name.trim())} />

          <div className={styles.connectionColumns}>
            <div className={styles.connectionColumn}>
              <h3>Following</h3>
              {groupedConnections.follow.length > 0 ? groupedConnections.follow.map((connection) => (
                <div key={connection.id} className={styles.connectionCard}>{connection.name}</div>
              )) : <p className={styles.muted}>Nobody followed yet.</p>}
            </div>
            <div className={styles.connectionColumn}>
              <h3>Private read</h3>
              {groupedConnections.privateRead.length > 0 ? groupedConnections.privateRead.map((connection) => (
                <div key={connection.id} className={styles.connectionCard}>{connection.name}</div>
              )) : <p className={styles.muted}>No private-read creators yet.</p>}
            </div>
            <div className={styles.connectionColumn}>
              <h3>Collaborators</h3>
              {groupedConnections.collaborator.length > 0 ? groupedConnections.collaborator.map((connection) => (
                <div key={connection.id} className={styles.connectionCard}>{connection.name}</div>
              )) : <p className={styles.muted}>No collaborators yet.</p>}
            </div>
          </div>

          {isEditing && (
            <div className={styles.connectionEditor}>
              {creatorConnections.map((connection, index) => (
                <div key={connection.id} className={styles.connectionEditorRow}>
                  <input
                    className={styles.input}
                    value={connection.name}
                    placeholder="Creator name"
                    onChange={(event) => handleConnectionChange(index, { name: event.target.value })}
                  />
                  <select
                    className={styles.select}
                    value={connection.kind}
                    onChange={(event) => handleConnectionChange(index, { kind: event.target.value as CreatorConnection['kind'] })}
                  >
                    <option value="follow">Following</option>
                    <option value="private-read">Private read</option>
                    <option value="collaborator">Collaborator</option>
                  </select>
                  <input
                    className={styles.input}
                    value={connection.note ?? ''}
                    placeholder="Optional note"
                    onChange={(event) => handleConnectionChange(index, { note: event.target.value })}
                  />
                  <button className={styles.iconButton} onClick={() => handleRemoveConnection(index)} aria-label={`Remove ${connection.name || 'creator connection'}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppPageLayout>
  );
};
