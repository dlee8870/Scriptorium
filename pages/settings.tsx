import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SettingsPageProps {
  token: string | null;
}

type EditableField = 'firstName' | 'lastName' | 'phoneNumber';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const token = context.req.cookies.token || null;

  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: { token },
  };
};

export default function SettingsPage({ token }: SettingsPageProps) {
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    avatar: string;
    newAvatar: File | null;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    avatar: '/uploads/default.png',
    newAvatar: null,
  });

  const [isEditing, setIsEditing] = useState<Record<EditableField, boolean>>({
    firstName: false,
    lastName: false,
    phoneNumber: false,
  });

  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/users/profile', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch profile');

        const profile = await res.json();
        setFormData({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phoneNumber: profile.phoneNumber || '',
          avatar: profile.avatar || '/uploads/default.png',
          newAvatar: null,
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        alert('Failed to load profile. Please log in again.');
        router.push('/login');
      }
    };

    fetchProfile();
  }, [token, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, newAvatar: file });
    }
  };

  const handleAvatarUpload = async () => {
    if (!formData.newAvatar) return;

    const formPayload = new FormData();
    formPayload.append('file', formData.newAvatar);

    try {
      const res = await fetch('/api/users/avatar-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formPayload,
      });

      if (!res.ok) throw new Error('Failed to upload avatar');
      const data = await res.json();
      setFormData({ ...formData, avatar: data.url, newAvatar: null });
      alert('Avatar updated successfully');
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Failed to update avatar');
    }
  };

  const handleEditSubmit = async (field: EditableField) => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: formData[field] }),
      });

      if (!res.ok) throw new Error(`Failed to update ${field}`);
      alert(`${field} updated successfully`);
      setIsEditing({ ...isEditing, [field]: false });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  };

  const fields: Array<{ key: EditableField; label: string }> = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'phoneNumber', label: 'Phone number' },
  ];

  return (
    <div className="app-page">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Account</p>
        <h1 className="mt-2 text-4xl font-black text-white">Settings</h1>
        <p className="mt-2 text-slate-300">Manage the profile details shown around Scriptorium.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="app-card p-6">
          <div className="flex flex-col items-center text-center">
            <Image
              src={formData.avatar}
              alt="Avatar"
              width={128}
              height={128}
              className="h-32 w-32 rounded-full border-4 border-slate-700 object-cover shadow-xl"
            />
            <h2 className="mt-4 text-xl font-bold text-white">
              {formData.firstName || 'First'} {formData.lastName || 'Last'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{formData.email || 'email@example.com'}</p>
          </div>

          <div className="mt-6 space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-950 hover:file:bg-white"
            />
            <button onClick={handleAvatarUpload} className="btn-primary w-full" disabled={!formData.newAvatar}>
              Upload Avatar
            </button>
          </div>
        </aside>

        <section className="app-card p-6">
          <h2 className="text-xl font-bold text-white">Profile Information</h2>
          <div className="mt-5 divide-y divide-slate-800">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-3 py-4 md:grid-cols-[160px_1fr_auto] md:items-center">
                <span className="text-sm font-semibold text-slate-300">{field.label}</span>
                {isEditing[field.key] ? (
                  <input
                    type="text"
                    value={formData[field.key]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="form-input"
                  />
                ) : (
                  <span className="text-slate-100">{formData[field.key] || 'N/A'}</span>
                )}
                <div className="flex gap-2">
                  {isEditing[field.key] ? (
                    <>
                      <button onClick={() => handleEditSubmit(field.key)} className="btn-success">
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditing({ ...isEditing, [field.key]: false })}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing({ ...isEditing, [field.key]: true })} className="btn-secondary">
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="grid gap-3 py-4 md:grid-cols-[160px_1fr] md:items-center">
              <span className="text-sm font-semibold text-slate-300">Email</span>
              <span className="text-slate-100">{formData.email}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
