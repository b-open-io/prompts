---
name: "BigBlocks Social Components Integration"
version: "1.0.0"
description: "Master real Bitcoin blockchain social interactions with production-ready components and workflows"
category: "bigblocks"
tags: ["social", "blockchain", "bitcoin", "components", "bmap-api", "transactions", "real-data"]
author: "BSV Development Team"
requirements:
  tools: ["Claude Code", "npx bigblocks", "npm/bun"]
  environment: ["BMAP_API_URL", "BSV_NETWORK", "BITCOIN_PRIVATE_KEY"]
  dependencies: ["bigblocks/component-ecosystem-manager"]
metadata:
  llm_provider: ["claude"]
  complexity: "advanced"
  estimated_tokens: 16000
  time_estimate: "45-90 minutes"
  bigblocks_version: ">=0.0.12"
  adaptive_architecture: true
---

# BigBlocks Social Components Integration

**Master Real Bitcoin Blockchain Social Interactions with Production-Ready Components**

## 🎯 Mission

Implement and orchestrate BigBlocks social components with real Bitcoin blockchain functionality. Transform any application into a Bitcoin-native social platform with likes, posts, follows, friend requests, and complete transaction workflows using actual BSV blockchain data.

## 🔄 Adaptive Architecture Detection

Before implementing, this prompt automatically detects and adapts to:

### Version Detection
```bash
# Detect current BigBlocks version
BIGBLOCKS_VERSION=$(npm list bigblocks --depth=0 | grep bigblocks | awk '{print $2}')
echo "Detected BigBlocks version: $BIGBLOCKS_VERSION"

# Detect BMAP API architecture
check_bmap_architecture() {
    # Test if /ingest endpoint returns bsocial overlay format
    local response=$(curl -s -X POST "$BMAP_API_URL/ingest" -d '{"test":true}')
    
    if echo "$response" | grep -q "sigmaidentity"; then
        echo "DETECTED: New bsocial overlay architecture (read-only BMAP)"
        export BMAP_ARCHITECTURE="bsocial-overlay"
    else
        echo "DETECTED: Legacy monolithic BMAP architecture"
        export BMAP_ARCHITECTURE="monolithic"
    fi
}

# Detect available APIs and features
detect_api_capabilities() {
    # Check for new MessageMeta support
    if curl -s "$BMAP_API_URL/messages" | grep -q "meta"; then
        export SUPPORTS_MESSAGE_META=true
    fi
    
    # Check for Type 42 identity support
    if npm list bitcoin-backup | grep -q "0.0.[2-9]"; then
        export SUPPORTS_TYPE_42=true
    fi
}
```

### Architecture Adaptation
The implementation automatically adjusts based on detected architecture:

```typescript
// Adaptive transaction submission
const submitTransaction = async (tx: Transaction) => {
  if (BMAP_ARCHITECTURE === 'bsocial-overlay') {
    // New architecture: BMAP forwards to bsocial
    return submitViaBsocialOverlay(tx);
  } else {
    // Legacy: Direct BMAP submission
    return submitDirectToBmap(tx);
  }
};
```

## 🚀 Revolutionary Social Blockchain Capabilities

### 1. **Real Bitcoin Social Transactions**
- **PostCard Component**: Auto-fetches real Bitcoin like data with `useFetchLikes`
- **FriendsDialog Component**: Real friend actions with blockchain API integration
- **SocialProfile Component**: Complete Bitcoin transaction objects in all callbacks
- **LikeButton Component**: Actual BSV transaction workflows for social interactions

### 2. **Production-Ready Social Hooks**
- **`useFetchLikes`**: Real Bitcoin like data from blockchain
- **`useFetchPosts`**: Blockchain post data with transaction history
- **`useFetchFriends`**: Real friend connections via Bitcoin transactions
- **`useSocialActions`**: Bitcoin transaction callbacks for all social actions
- **`useAuth`**: Bitcoin authentication workflows with private key management
- **`useBmapApi`**: Direct bmap-api-types integration for blockchain data

### 3. **bmap-api-types Integration**
- **No Duplicate Types**: Everything uses bmap-api-types v0.0.9 directly
- **Real API Calls**: Actual blockchain API endpoints for all social data
- **Transaction Objects**: Complete Bitcoin transaction data in all components
- **Type Safety**: Full TypeScript support with blockchain data structures

### 4. **Social Component Ecosystem**
- **96 Components Available**: Full BigBlocks component library integration
- **CLI Installation**: `npx bigblocks add` for instant component setup
- **Framework Agnostic**: Works with React, Next.js, Express, Astro
- **Theme Consistency**: Unified design system across all social components

## 🧠 Social Integration StateFlow

```yaml
social_integration_flow:
  initial_state: "analyze_social_requirements"
  
  states:
    analyze_social_requirements:
      description: "Analyze application's social feature requirements"
      actions:
        - "identify_required_social_components"
        - "map_social_user_journeys_and_interactions"
        - "determine_blockchain_transaction_patterns"
        - "assess_bmap_api_integration_needs"
        - "plan_authentication_and_identity_workflows"
      success_transitions:
        - requirements_mapped: "setup_blockchain_infrastructure"
      error_transitions:
        - unclear_requirements: "gather_social_feature_specifications"

    setup_blockchain_infrastructure:
      description: "Configure Bitcoin blockchain infrastructure"
      actions:
        - "configure_bmap_api_endpoints_and_authentication"
        - "setup_bitcoin_private_key_management"
        - "establish_bsv_network_connections"
        - "configure_transaction_broadcasting_system"
        - "setup_blockchain_data_caching_strategy"
      success_transitions:
        - infrastructure_ready: "install_social_components"
      error_transitions:
        - infrastructure_failed: "troubleshoot_blockchain_connectivity"

    install_social_components:
      description: "Install and configure BigBlocks social components"
      parallel_actions:
        core_social_components:
          - "npx bigblocks add PostCard"
          - "npx bigblocks add FriendsDialog"
          - "npx bigblocks add SocialProfile"
          - "npx bigblocks add LikeButton"
        
        utility_components:
          - "npx bigblocks add UserAvatar"
          - "npx bigblocks add NotificationPanel"
          - "npx bigblocks add ActivityFeed"
          - "npx bigblocks add MessageThread"
        
        authentication_components:
          - "npx bigblocks add LoginForm"
          - "npx bigblocks add WalletConnect"
          - "npx bigblocks add IdentityVerification"
      
      success_transitions:
        - components_installed: "configure_social_hooks"
      error_transitions:
        - installation_failed: "troubleshoot_component_installation"

    configure_social_hooks:
      description: "Setup blockchain-connected social hooks"
      actions:
        - "configure_useFetchLikes_with_real_blockchain_data"
        - "setup_useFetchPosts_with_transaction_history"
        - "implement_useFetchFriends_with_bitcoin_connections"
        - "configure_useSocialActions_with_transaction_callbacks"
        - "setup_useAuth_with_bitcoin_private_key_workflows"
        - "integrate_useBmapApi_for_direct_blockchain_access"
      success_transitions:
        - hooks_configured: "implement_social_workflows"
      error_transitions:
        - hook_configuration_failed: "debug_blockchain_hook_integration"

    implement_social_workflows:
      description: "Build complete social interaction workflows"
      actions:
        - "implement_like_post_with_bitcoin_transaction"
        - "build_friend_request_blockchain_workflow"
        - "create_post_creation_with_blockchain_storage"
        - "setup_follow_unfollow_bitcoin_transactions"
        - "implement_message_sending_via_blockchain"
        - "create_notification_system_with_blockchain_events"
      success_transitions:
        - workflows_implemented: "test_social_functionality"
      error_transitions:
        - workflow_implementation_failed: "debug_social_interaction_flows"

    test_social_functionality:
      description: "Comprehensive testing of social blockchain features"
      actions:
        - "test_all_social_components_with_real_data"
        - "verify_bitcoin_transaction_flows_work_correctly"
        - "test_blockchain_data_fetching_and_caching"
        - "validate_social_hook_integration_and_callbacks"
        - "test_authentication_and_identity_workflows"
        - "verify_bmap_api_integration_functionality"
      success_transitions:
        - testing_successful: "optimize_performance"
      error_transitions:
        - testing_failed: "fix_social_functionality_issues"

    optimize_performance:
      description: "Optimize social component performance and user experience"
      actions:
        - "optimize_blockchain_data_caching_strategies"
        - "implement_lazy_loading_for_social_components"
        - "optimize_bitcoin_transaction_batching"
        - "setup_real_time_updates_for_social_data"
        - "implement_offline_social_interaction_queuing"
      success_transitions:
        - optimization_complete: "deploy_social_features"

    deploy_social_features:
      description: "Deploy social components to production"
      actions:
        - "deploy_social_components_with_monitoring"
        - "setup_blockchain_transaction_monitoring"
        - "configure_social_analytics_and_metrics"
        - "establish_social_feature_health_checks"
        - "create_social_component_usage_documentation"
      success_transitions:
        - deployment_successful: "complete"

error_recovery:
  troubleshoot_blockchain_connectivity:
    description: "Fix blockchain infrastructure issues"
    actions:
      - "diagnose_bmap_api_connection_problems"
      - "verify_bsv_network_accessibility"
      - "check_bitcoin_private_key_configuration"
      - "test_transaction_broadcasting_capabilities"
      
  fix_social_functionality_issues:
    description: "Resolve social component integration problems"
    actions:
      - "debug_component_blockchain_data_integration"
      - "fix_social_hook_callback_issues"
      - "resolve_transaction_workflow_problems"
      - "repair_authentication_integration_failures"
```

## 📦 Component Installation & Setup

### Core Social Components Installation
```bash
# Essential social components with real Bitcoin functionality
install_core_social_components() {
    echo "🎨 Installing BigBlocks Social Components..."
    
    # Core social interaction components
    npx bigblocks add PostCard       # Real Bitcoin likes and engagement
    npx bigblocks add FriendsDialog  # Blockchain friend connections
    npx bigblocks add SocialProfile  # Bitcoin identity and reputation
    npx bigblocks add LikeButton     # Actual BSV transaction workflows
    
    # Supporting social components
    npx bigblocks add UserAvatar     # Identity visualization
    npx bigblocks add ActivityFeed   # Blockchain activity streams
    npx bigblocks add NotificationPanel  # Real-time blockchain notifications
    npx bigblocks add MessageThread  # Bitcoin-based messaging
    
    echo "✅ Core social components installed"
}

# Authentication and identity components
install_auth_components() {
    echo "🔐 Installing Authentication Components..."
    
    npx bigblocks add LoginForm          # Bitcoin-based authentication
    npx bigblocks add WalletConnect      # BSV wallet integration
    npx bigblocks add IdentityVerification  # BAP identity verification
    npx bigblocks add KeyManagement      # Bitcoin private key workflows
    
    echo "✅ Authentication components installed"
}

# Advanced social features
install_advanced_social_components() {
    echo "🚀 Installing Advanced Social Components..."
    
    npx bigblocks add PaymentFlow        # Bitcoin payment integration
    npx bigblocks add TokenRewards       # Social token incentives
    npx bigblocks add ContentCreation    # Blockchain content publishing
    npx bigblocks add SocialAnalytics    # Blockchain social metrics
    
    echo "✅ Advanced social components installed"
}
```

### Social Hooks Configuration

```typescript
// Configure real Bitcoin blockchain social hooks
import { 
  useFetchLikes, 
  useFetchPosts, 
  useFetchFriends,
  useSocialActions,
  useAuth,
  useBmapApi 
} from 'bigblocks';

// Real Bitcoin likes integration
export const useRealBitcoinLikes = (postId: string) => {
  const { data: likes, loading, error, refetch } = useFetchLikes({
    postId,
    apiUrl: process.env.BMAP_API_URL,
    includeTransactionData: true,
    realTimeUpdates: true
  });
  
  // Return real blockchain data with transaction details
  return {
    likes: likes?.map(like => ({
      ...like,
      transactionId: like.txid,
      blockHeight: like.blk?.i,
      timestamp: like.timestamp,
      bitcoinAddress: like.author
    })),
    totalLikes: likes?.length || 0,
    loading,
    error,
    refetch
  };
};

// Real Bitcoin friend connections
export const useRealBitcoinFriends = (userId: string) => {
  const { data: friends, loading, error } = useFetchFriends({
    userId,
    includeTransactionHistory: true,
    includeMutualConnections: true
  });
  
  return {
    friends: friends?.map(friend => ({
      ...friend,
      connectionTransactionId: friend.connectionTxid,
      connectionDate: friend.connectionTimestamp,
      mutualFriends: friend.mutualConnections || [],
      bitcoinAddress: friend.address
    })),
    totalFriends: friends?.length || 0,
    loading,
    error
  };
};

// Real Bitcoin social actions with transaction callbacks
export const useRealBitcoinSocialActions = () => {
  const { executeAction, loading, error } = useSocialActions({
    apiUrl: process.env.BMAP_API_URL,
    privateKey: process.env.BITCOIN_PRIVATE_KEY,
    broadcastTransactions: true
  });
  
  const likePost = async (postId: string) => {
    const result = await executeAction('like', {
      postId,
      onTransactionBroadcast: (txid) => {
        console.log('✅ Like transaction broadcast:', txid);
      },
      onConfirmation: (txid, blockHeight) => {
        console.log('✅ Like confirmed in block:', blockHeight);
      }
    });
    
    return result;
  };
  
  const sendFriendRequest = async (friendAddress: string) => {
    const result = await executeAction('friendRequest', {
      friendAddress,
      onTransactionBroadcast: (txid) => {
        console.log('✅ Friend request transaction broadcast:', txid);
      }
    });
    
    return result;
  };
  
  return {
    likePost,
    sendFriendRequest,
    loading,
    error
  };
};
```

### bmap-api Integration

```typescript
// Direct bmap-api-types integration for real blockchain data
import { useBmapApi } from 'bigblocks';
import type { 
  BmapPost, 
  BmapLike, 
  BmapUser, 
  BmapTransaction 
} from 'bmap-api-types';

export const useBlockchainSocialData = () => {
  const { query, loading, error } = useBmapApi({
    baseUrl: process.env.BMAP_API_URL,
    timeout: 5000
  });
  
  // Fetch real posts from blockchain
  const fetchPosts = async (limit: number = 20): Promise<BmapPost[]> => {
    const posts = await query('/posts', {
      limit,
      includeTransactions: true,
      includeMetadata: true
    });
    
    return posts.map((post: BmapPost) => ({
      ...post,
      likes: post.likes || [],
      comments: post.comments || [],
      transactionData: post.tx,
      blockchainConfirmed: !!post.blk
    }));
  };
  
  // Fetch real likes with transaction data
  const fetchLikesForPost = async (postId: string): Promise<BmapLike[]> => {
    const likes = await query(`/posts/${postId}/likes`, {
      includeTransactionData: true,
      includeUserData: true
    });
    
    return likes.map((like: BmapLike) => ({
      ...like,
      transactionId: like.txid,
      likerAddress: like.author,
      timestamp: like.timestamp,
      confirmed: !!like.blk
    }));
  };
  
  // Real user data from blockchain
  const fetchUserProfile = async (address: string): Promise<BmapUser> => {
    const user = await query(`/users/${address}`, {
      includeTransactionHistory: true,
      includeSocialConnections: true
    });
    
    return {
      ...user,
      bitcoinAddress: address,
      socialConnections: user.friends || [],
      transactionHistory: user.transactions || [],
      reputation: calculateUserReputation(user)
    };
  };
  
  return {
    fetchPosts,
    fetchLikesForPost,
    fetchUserProfile,
    loading,
    error
  };
};

// Calculate user reputation based on blockchain activity
const calculateUserReputation = (user: BmapUser): number => {
  const transactionCount = user.transactions?.length || 0;
  const socialConnections = user.friends?.length || 0;
  const contentCreated = user.posts?.length || 0;
  
  // Reputation algorithm based on real blockchain activity
  return Math.min(100, (transactionCount * 2) + (socialConnections * 5) + (contentCreated * 10));
};
```

## 🎨 Component Implementation Examples

### PostCard with Real Bitcoin Likes

```tsx
import React from 'react';
import { PostCard, useFetchLikes, useSocialActions } from 'bigblocks';
import type { BmapPost } from 'bmap-api-types';

interface BitcoinPostCardProps {
  post: BmapPost;
  showTransactionDetails?: boolean;
}

export const BitcoinPostCard: React.FC<BitcoinPostCardProps> = ({ 
  post, 
  showTransactionDetails = false 
}) => {
  // Real Bitcoin likes with transaction data
  const { likes, totalLikes, loading: likesLoading } = useFetchLikes({
    postId: post.id,
    includeTransactionData: true,
    realTimeUpdates: true
  });
  
  // Real Bitcoin social actions
  const { likePost, loading: actionLoading } = useSocialActions({
    apiUrl: process.env.BMAP_API_URL,
    privateKey: process.env.BITCOIN_PRIVATE_KEY
  });
  
  const handleLike = async () => {
    try {
      const result = await likePost(post.id);
      console.log('✅ Like transaction broadcast:', result.txid);
    } catch (error) {
      console.error('❌ Like transaction failed:', error);
    }
  };
  
  return (
    <PostCard
      post={post}
      likes={likes}
      totalLikes={totalLikes}
      onLike={handleLike}
      loading={likesLoading || actionLoading}
      showTransactionDetails={showTransactionDetails}
      realTimeUpdates={true}
      blockchainVerified={!!post.blk}
    />
  );
};
```

### FriendsDialog with Blockchain Connections

```tsx
import React from 'react';
import { FriendsDialog, useFetchFriends, useSocialActions } from 'bigblocks';
import type { BmapUser } from 'bmap-api-types';

interface BitcoinFriendsDialogProps {
  user: BmapUser;
  isOpen: boolean;
  onClose: () => void;
}

export const BitcoinFriendsDialog: React.FC<BitcoinFriendsDialogProps> = ({
  user,
  isOpen,
  onClose
}) => {
  // Real Bitcoin friend connections
  const { friends, loading: friendsLoading } = useFetchFriends({
    userId: user.address,
    includeTransactionHistory: true,
    includeMutualConnections: true
  });
  
  // Real Bitcoin social actions
  const { sendFriendRequest, acceptFriendRequest } = useSocialActions();
  
  const handleSendFriendRequest = async (friendAddress: string) => {
    try {
      const result = await sendFriendRequest(friendAddress);
      console.log('✅ Friend request sent:', result.txid);
    } catch (error) {
      console.error('❌ Friend request failed:', error);
    }
  };
  
  return (
    <FriendsDialog
      user={user}
      friends={friends?.map(friend => ({
        ...friend,
        connectionTransactionId: friend.connectionTxid,
        mutualFriends: friend.mutualConnections || [],
        bitcoinAddress: friend.address
      }))}
      isOpen={isOpen}
      onClose={onClose}
      onSendFriendRequest={handleSendFriendRequest}
      onAcceptFriendRequest={acceptFriendRequest}
      loading={friendsLoading}
      showTransactionHistory={true}
      realTimeUpdates={true}
    />
  );
};
```

## 🔧 Advanced Social Features

### Real-Time Social Updates

```typescript
// Real-time blockchain social updates
import { useEffect } from 'react';
import { useBmapApi } from 'bigblocks';

export const useRealTimeSocialUpdates = (userId: string) => {
  const { subscribe, unsubscribe } = useBmapApi();
  
  useEffect(() => {
    // Subscribe to real-time blockchain events
    const subscriptions = [
      // New likes on user's posts
      subscribe(`user/${userId}/likes`, (like) => {
        console.log('🎉 New like received:', like);
        // Handle real-time like notification
      }),
      
      // New friend requests
      subscribe(`user/${userId}/friendRequests`, (request) => {
        console.log('👋 New friend request:', request);
        // Handle real-time friend request notification
      }),
      
      // New posts in user's network
      subscribe(`user/${userId}/networkPosts`, (post) => {
        console.log('📝 New post in network:', post);
        // Handle real-time post notification
      }),
      
      // Bitcoin transaction confirmations
      subscribe(`user/${userId}/transactions`, (transaction) => {
        console.log('⛓️ Transaction confirmed:', transaction);
        // Handle transaction confirmation
      })
    ];
    
    return () => {
      subscriptions.forEach(unsubscribe);
    };
  }, [userId, subscribe, unsubscribe]);
};
```

### Social Analytics Integration

```typescript
// Real Bitcoin social analytics
export const useSocialAnalytics = (userId: string) => {
  const { query } = useBmapApi();
  
  const getSocialMetrics = async () => {
    const metrics = await query(`/analytics/user/${userId}`, {
      includeTransactionMetrics: true,
      includeSocialEngagement: true,
      timeRange: '30d'
    });
    
    return {
      totalTransactions: metrics.transactionCount,
      socialEngagement: metrics.engagementScore,
      networkGrowth: metrics.friendGrowthRate,
      contentPerformance: metrics.postPerformance,
      bitcoinActivity: metrics.bitcoinMetrics,
      reputation: metrics.reputationScore
    };
  };
  
  return { getSocialMetrics };
};
```

## 📊 Testing & Validation

### Component Integration Testing

```bash
# Test all social components with real blockchain data
test_social_components() {
    echo "🧪 Testing BigBlocks Social Components..."
    
    # Test PostCard with real Bitcoin likes
    test_component_blockchain_integration "PostCard" "likes"
    
    # Test FriendsDialog with real connections
    test_component_blockchain_integration "FriendsDialog" "friends"
    
    # Test SocialProfile with real user data
    test_component_blockchain_integration "SocialProfile" "profile"
    
    # Test real-time updates
    test_realtime_blockchain_updates
    
    # Test transaction workflows
    test_bitcoin_transaction_flows
}

test_component_blockchain_integration() {
    local component=$1
    local data_type=$2
    
    echo "  🔍 Testing $component with real $data_type data..."
    
    # Create test environment
    setup_test_blockchain_environment
    
    # Test component with real data
    npm test -- --testNamePattern="$component.*$data_type.*blockchain"
    
    # Verify blockchain data integration
    verify_blockchain_data_integration "$component" "$data_type"
}
```

## 🚀 Deployment & Production

### Production Social Component Setup

```bash
# Deploy social components to production
deploy_social_components() {
    echo "🚀 Deploying BigBlocks Social Components..."
    
    # Build with production blockchain configuration
    BMAP_API_URL="https://api.bmapjs.com" \
    BSV_NETWORK="mainnet" \
    npm run build
    
    # Deploy with monitoring
    deploy_with_blockchain_monitoring
    
    # Setup social analytics
    setup_social_analytics_monitoring
    
    # Configure real-time updates
    configure_production_realtime_updates
}
```

---

**Transform any application into a Bitcoin-native social platform with real blockchain functionality, authentic transaction workflows, and production-ready social components that leverage the full power of the BSV ecosystem.**