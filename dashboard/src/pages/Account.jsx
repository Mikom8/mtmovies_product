import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiCalendar,
  FiCreditCard,
  FiAward,
} from "react-icons/fi";
import styles from "./Account.module.css";

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysRemaining = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining(user.planExpiresAt);
  const isPlanActive = user.plan !== "free" && daysRemaining > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Account Settings</h1>
        <p>Manage your profile and subscription details</p>
      </div>

      <div className={styles.content}>
        {/* Profile Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <FiUser className={styles.icon} />
            <h2>Profile</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.avatarWrap}>
              <img
                src={user.avatar}
                alt={user.name}
                className={styles.avatar}
              />
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Name</span>
              <span className={styles.value}>{user.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Email</span>
              <span className={styles.value}>
                <FiMail
                  style={{ marginRight: "8px", transform: "translateY(2px)" }}
                />
                {user.email}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Joined</span>
              <span className={styles.value}>
                <FiCalendar
                  style={{ marginRight: "8px", transform: "translateY(2px)" }}
                />
                {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <FiCreditCard className={styles.icon} />
            <h2>Subscription</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.planStatus}>
              <div className={styles.planBadgeWrap}>
                <span className={`${styles.planBadge} ${styles[user.plan]}`}>
                  <FiAward
                    style={{ marginRight: "6px", transform: "translateY(1px)" }}
                  />
                  {user.plan.toUpperCase()} PLAN
                </span>
                {isPlanActive ? (
                  <span className={styles.activeBadge}>Active</span>
                ) : (
                  <span className={styles.inactiveBadge}>Inactive</span>
                )}
              </div>
            </div>

            {user.plan !== "free" && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Expires On</span>
                <span className={styles.value}>
                  {formatDate(user.planExpiresAt)}
                </span>
              </div>
            )}

            {isPlanActive && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Days Remaining</span>
                <span className={styles.value}>
                  <strong
                    className={
                      daysRemaining <= 3 ? styles.urgent : styles.normal
                    }
                  >
                    {daysRemaining} Days
                  </strong>
                </span>
              </div>
            )}

            <button
              className={styles.upgradeBtn}
              onClick={() => navigate("/choose-plan")}
            >
              {user.plan === "free" ? "Upgrade Plan" : "Renew / Change Plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
