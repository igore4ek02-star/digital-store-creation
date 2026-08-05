import { Link } from 'react-router-dom';

interface Props {
  userId: number;
  name: string;
  className?: string;
}

const UserLink = ({ userId, name, className }: Props) => {
  return (
    <Link
      to={`/user/${userId}`}
      className={className || 'font-head text-sm font-semibold text-foreground transition-colors hover:text-brand-cyan'}
    >
      {name}
    </Link>
  );
};

export default UserLink;
