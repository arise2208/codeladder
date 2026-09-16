import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, LoadingSpinner, Modal } from '../../components/ui';
import BaseTable from '../../components/shared/BaseTable';
import StatusBadge from '../../components/shared/StatusBadge';
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

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <BaseTable
          variant="dark"
          className="border-[#383838]"
          headerClassName="bg-[#1a1a1a] border-b border-[#383838] text-gray-300 text-xs uppercase tracking-wider"
          bodyClassName="divide-y divide-[#383838] text-sm"
          headers={
            <tr>
              <th className="px-4 py-3.5 font-semibold text-xs tracking-wider">Title</th>
              <th className="px-4 py-3.5 font-semibold text-xs tracking-wider w-40">Owner</th>
              <th className="px-4 py-3.5 font-semibold text-xs tracking-wider w-28">Members</th>
              <th className="px-4 py-3.5 font-semibold text-xs tracking-wider w-32">Mode</th>
              <th className="px-4 py-3.5 font-semibold text-xs tracking-wider text-right w-24">Actions</th>
            </tr>
          }
          emptyMessage="No ladders found."
        >
          {ladders.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-gray-400">
                No ladders found.
              </td>
            </tr>
          ) : (
            ladders.map((l) => {
              const ladderId = l._id || l.id;
              const ownerName = l.ownerId?.username || l.owner || '—';
              return (
                <tr
                  key={ladderId}
                  className="h-16 min-h-[4rem] hover:bg-[#323232] transition-colors align-middle"
                >
                  <td className="px-4 py-3 font-medium text-[#eff2f6] align-middle">{l.title}</td>
                  <td className="px-4 py-3 text-gray-400 align-middle whitespace-nowrap">@{ownerName}</td>
                  <td className="px-4 py-3 text-gray-300 align-middle whitespace-nowrap">{l.memberCount || 1}</td>
                  <td className="px-4 py-3 align-middle whitespace-nowrap">
                    <StatusBadge type="role" role={l.mode || 'NORMAL'} label={l.mode || 'NORMAL'} />
                  </td>
                  <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-400 border-rose-900/50 hover:bg-rose-950/30"
                      onClick={() => setDeleteModal({ isOpen: true, id: ladderId })}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </BaseTable>
      )}

      <Modal
        open={deleteModal.isOpen}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Delete Ladder"
      >
        <p className="mb-4 text-[#eff2f6] text-sm">Are you sure you want to delete this ladder? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, id: null })} className="border-[#383838] text-gray-300 hover:bg-[#383838]">
            Cancel
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
