export function getCfRatingStyle(rating) {
  if (!rating || rating <= 0) {
    return {
      text: '#6B7280',
      bg: '#F9FAFB',
      border: '#E5E7EB',
      dot: '#9CA3AF',
      label: 'Unrated',
    };
  }
  if (rating < 1200) {
    return {
      text: '#808080',
      bg: '#F3F4F6',
      border: '#D1D5DB',
      dot: '#808080',
      label: 'Newbie',
    };
  }
  if (rating < 1400) {
    return {
      text: '#008000',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      dot: '#008000',
      label: 'Pupil',
    };
  }
  if (rating < 1600) {
    return {
      text: '#03A89E',
      bg: '#ECFEFF',
      border: '#A5F3FC',
      dot: '#03A89E',
      label: 'Specialist',
    };
  }
  if (rating < 1900) {
    return {
      text: '#0000FF',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      dot: '#0000FF',
      label: 'Expert',
    };
  }
  if (rating < 2100) {
    return {
      text: '#AA00AA',
      bg: '#FAF5FF',
      border: '#E9D5FF',
      dot: '#AA00AA',
      label: 'Candidate Master',
    };
  }
  if (rating < 2400) {
    return {
      text: '#FF8C00',
      bg: '#FFF7ED',
      border: '#FED7AA',
      dot: '#FF8C00',
      label: 'Master',
    };
  }
  if (rating < 2600) {
    return {
      text: '#FF0000',
      bg: '#FEF2F2',
      border: '#FECACA',
      dot: '#FF0000',
      label: 'Grandmaster',
    };
  }
  return {
    text: '#CC0000',
    bg: '#FEF2F2',
    border: '#FECACA',
    dot: '#CC0000',
    label: 'Legendary Grandmaster',
  };
}
