import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Badge, LoadingSpinner, Modal } from '../../components/ui';
import api, { getErrorMessage } from '../../lib/api';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

export default function AdminLaddersPage() {
  const [ladders, setLadders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const fetchLadders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/ladders');
      setLadders(Array.isArray(data) ? data : (data.ladders || []));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch ladders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLadders(); }, []);

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/ladders/${deleteModal.id}`);
      toast.success('Ladder deleted');
      setDeleteModal({ isOpen: false, id: null });
      fetchLadders();
    } catch (err) {
      toast.error('Failed to delete ladder');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Admin: Ladders" breadcrumbs={[{ label: 'Admin' }, { label: 'Ladders' }]} />

      {loading ? <LoadingSpinner /> : (
        <div className="card bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="table-header bg-[#1E1F25] text-white">
                <th className="p-3">Title</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Members</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ladders.map((l) => {
                const ladderId = l._id || l.id;
                const ownerName = l.ownerId?.username || l.owner || '—';
                return (
                  <tr key={ladderId} className="table-row border-b border-[#E5E7EB] hover:bg-[#F8F9FB]">
                    <td className="p-3 font-medium text-[#1E1F25]">{l.title}</td>
                    <td className="p-3 text-[#6B7280]">@{ownerName}</td>
                    <td className="p-3">{l.memberCount || 1}</td>
                    <td className="p-3"><Badge>{l.mode || 'NORMAL'}</Badge></td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-500 hover:bg-red-50"
                        onClick={() => setDeleteModal({ isOpen: true, id: ladderId })}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.isOpen}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Delete Ladder"
      >
        <p className="mb-4 text-[#1E1F25]">Are you sure you want to delete this ladder? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, id: null })}>Cancel</Button>
          <Button className="bg-red-500 text-white hover:bg-red-600" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
